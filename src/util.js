'use strict'

const multihashing = require('multihashing-async')
const CID = require('cids')

exports = module.exports

// Hash is the global IPFS hash function. uses multihash SHA2_256, 256 bits
exports.hash = (type, data, cb) => multihashing(data, type, cb)

exports.linkSort = (a, b) => {
  return (new Buffer(a.name || '', 'ascii').compare(new Buffer(b.name || '', 'ascii')))
}

exports.cid = (node, callback) => {
  callback(null, new CID(node.multihash))
}

