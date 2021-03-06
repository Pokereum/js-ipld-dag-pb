/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

'use strict'

const expect = require('chai').expect
const dagPB = require('../src')
const DAGNode = dagPB.DAGNode
const util = dagPB.util
const resolver = dagPB.resolver
const parallel = require('async/parallel')

const Block = require('ipfs-block')

describe('IPLD format resolver (local)', () => {
  let emptyNodeBlock
  let linksNodeBlock
  let dataLinksNodeBlock

  const links = [{
    Name: '',
    Hash: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39U',
    Size: 10
  }, {
    Name: 'named link',
    Hash: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39V',
    Size: 8
  }]

  before((done) => {
    // create a bunch of nodes serialized into Blocks
    //    const d1 = new DAGNode(new Buffer('some data'), l1)
    const emptyNode = new DAGNode(new Buffer(0))

    const linksNode = new DAGNode(new Buffer(0), links)
    const dataLinksNode = new DAGNode(new Buffer('aaah the data'), links)

    parallel([
      (cb) => {
        util.serialize(emptyNode, (err, serialized) => {
          expect(err).to.not.exist
          emptyNodeBlock = new Block(serialized)
          cb()
        })
      },
      (cb) => {
        util.serialize(linksNode, (err, serialized) => {
          expect(err).to.not.exist
          linksNodeBlock = new Block(serialized)
          cb()
        })
      },
      (cb) => {
        util.serialize(dataLinksNode, (err, serialized) => {
          expect(err).to.not.exist
          dataLinksNodeBlock = new Block(serialized)
          cb()
        })
      }
    ], done)
  })

  it('multicodec is dag-pb', () => {
    expect(resolver.multicodec).to.equal('dag-pb')
  })

  describe('empty node', () => {
    describe('resolver.resolve', () => {
      it('links path', (done) => {
        resolver.resolve(emptyNodeBlock, 'links', (err, result) => {
          expect(err).to.not.exist
          expect(result.value).to.eql([])
          expect(result.remainderPath).to.eql('')
          done()
        })
      })

      it('data path', (done) => {
        resolver.resolve(emptyNodeBlock, 'data', (err, result) => {
          expect(err).to.not.exist
          expect(result.value).to.eql(new Buffer(0))
          expect(result.remainderPath).to.eql('')
          done()
        })
      })

      it('non existent path', (done) => {
        resolver.resolve(emptyNodeBlock, 'pathThatDoesNotExist', (err, result) => {
          expect(err).to.exist
          done()
        })
      })
    })

    it('resolver.tree', (done) => {
      resolver.tree(emptyNodeBlock, (err, paths) => {
        expect(err).to.not.exist
        expect(paths).to.eql([])
        done()
      })
    })
  })

  describe('links node', () => {
    describe('resolver.resolve', () => {
      it('links path', (done) => {
        resolver.resolve(linksNodeBlock, 'links', (err, result) => {
          expect(err).to.not.exist
          expect(result.value).to.eql(links)
          expect(result.remainderPath).to.eql('')
          done()
        })
      })

      it('links position path', (done) => {
        resolver.resolve(linksNodeBlock, 'links/1', (err, result) => {
          expect(err).to.not.exist
          expect(result.value).to.eql(links[1].Hash)
          expect(result.remainderPath).to.eql('')
          done()
        })
      })

      it('yield remainderPath if impossible to resolve through (a)', (done) => {
        resolver.resolve(linksNodeBlock, 'links/1/data', (err, result) => {
          expect(err).to.not.exist
          expect(result.value['/']).to.exist
          expect(result.value['/']).to.equal('QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39V')
          expect(result.remainderPath).to.equal('data')
          done()
        })
      })

      it('yield remainderPath if impossible to resolve through (b)', (done) => {
        resolver.resolve(linksNodeBlock, 'links/1/links/0/data', (err, result) => {
          expect(err).to.not.exist
          expect(result.value['/']).to.equal('QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39V')

          expect(result.remainderPath).to.equal('links/0/data')
          done()
        })
      })
    })

    it('resolver.tree', (done) => {
      resolver.tree(linksNodeBlock, (err, paths) => {
        expect(err).to.not.exist
        expect(paths).to.eql([{
          path: '',
          value: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39U'
        }, {
          path: 'named link',
          value: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39V'
        }])
        done()
      })
    })
  })

  describe('links and data node', () => {
    describe('resolver.resolve', (done) => {
      it('links path', (done) => {
        resolver.resolve(dataLinksNodeBlock, 'links', (err, result) => {
          expect(err).to.not.exit
          expect(result.value).to.eql(links)
          expect(result.remainderPath).to.eql('')
          done()
        })
      })

      it('data path', (done) => {
        resolver.resolve(dataLinksNodeBlock, 'data', (err, result) => {
          expect(err).to.not.exist
          expect(result.value).to.eql(new Buffer('aaah the data'))
          expect(result.remainderPath).to.eql('')
          done()
        })
      })

      it('non existent path', (done) => {
        resolver.resolve(dataLinksNodeBlock, 'pathThatDoesNotExist', (err, result) => {
          expect(err).to.exist
          done()
        })
      })
    })

    it('resolver.tree', (done) => {
      resolver.tree(dataLinksNodeBlock, (err, paths) => {
        expect(err).to.not.exist
        expect(paths).to.eql([{
          path: '',
          value: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39U'
        }, {
          path: 'named link',
          value: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39V'
        }, {
          path: 'data',
          value: new Buffer('aaah the data')
        }])
        done()
      })
    })
  })
})
