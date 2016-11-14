'use strict'

const stable = require('stable')
const sort = stable.inplace
const mh = require('multihashes')
const util = require('./util')
const DAGLink = require('./dag-link')

class DAGNodeFactory {
  static create (data, dagLinks, hashAlg) {
    if (!dagLinks) {
      dagLinks = []
    }

    if (!hashAlg) {
      hashAlg = 'sha2-256'
    }

    const links = dagLinks.map((l) => {
      if (!l.constructor && l.constructor.name !== 'DAGLink') {
        return l
      } 

      // haadcode: are the .name vs .Name for backwards compatibility?
      const link = new DAGLink(l.name || l.Name,
                               l.size || l.Size,
                               l.hash || l.Hash || l.multihash)
      return link
    })

    // haadcode: would be better to have: links = sort(links, util.linkSort)
    sort(links, util.linkSort)

    return new Promise((resolve, reject) => {
      util.serialize({ data: data, links: links}, (err, serialized) => {
        if (err) {
          reject(err)
        }
        util.hash(hashAlg, serialized, (err, multihash) => {
          if (err) {
            reject(err)
          }
          const dagNode = new DAGNode(data, links, serialized, multihash)
          resolve(dagNode)
        })
      })

      /* 
        Alternatively, if util functions were promisified, 
        we could write this much shorter as:
        
        return util.serialize({ data: data, links: links})
          .then((serialized) => util.hash(hashAlg, serialized))
          .then((multihash) => new DAGNode(data, links, serialized, multihash))
      */
    })
  }  

  static addLink(dagNode, nameOrLink, nodeOrMultihash) {
    const links = DAGNodeFactory._cloneLinks(dagNode)
    const data = DAGNodeFactory._cloneData(dagNode)
    let newLink = null

    if ((nameOrLink.constructor &&
         nameOrLink.constructor.name === 'DAGLink')) {
      // It's a link
      newLink = nameOrLink
    } else if (typeof nameOrLink === 'string') {
      // It's a name
      const name = nameOrLink
      if ((nodeOrMultihash.constructor &&
         nodeOrMultihash.constructor.name === 'DAGNode')) {
        // It's a node
        // haadcode: not sure what ^ means, so the line below might not be correct
        newLink = DAGNodeFactory.toDAGLink(nodeOrMultihash)
      } else {
        // It's a multihash
        // haadcode: not sure what ^ means, so the line below might not be correct
        newLink = new DAGLink(null, dagNode.size, nodeOrMultihash)
      }
    }

    if (link) {
      links.push(link)
      sort(links, util.linkSort)      
    } else {
      throw new Error("Link given as the argument is invalid")
    }

    // haadcode: shouldn't we clone the serialized and multihash properties too?
    return DAGNodeFactory.create(data, links, dagNode.serialized, dagNode.multihash)
  }

  static removeLink(dagNode, nameOrMultihash) {
    let data = DAGNodeFactory._cloneData(dagNode)
    let links = DAGNodeFactory._cloneLinks(dagNode)

    if (typeof nameOrMultihash === 'string') {
      links = dagNode.links.filter((link) => link.name !== nameOrMultihash)
    } else if (Buffer.isBuffer(nameOrMultihash)) {
      links = dagNode.links.filter((link) => !link.hash.equals(nameOrMultihash))
    } else {
      throw new Error('second arg needs to be a name or multihash')
    }

    // haadcode: shouldn't we clone the serialized and multihash properties too?
    return DAGNodeFactory.create(data, links, dagNode.serialized, dagNode.multihash)
  }

  /*
   * toDAGLink converts a DAGNode to a DAGLink
   */
  // was: makeLink(node, callback)
  static toDAGLink (dagNode) {
    return new DAGLink(null, dagNode.size, dagNode.multihash)
  }

  static clone (dagNode) {
    const data = DAGNodeFactory._cloneData(dagNode)
    const links = DAGNodeFactory._cloneLinks(dagNode)
    // haadcode: shouldn't we clone the serialized and multihash properties too?
    return DAGNodeFactory.create(data, links, dagNode.serialized, dagNode.multihash)
  }

  static _cloneData(dagNode) {
    let data = new Buffer(0)
    if (dagNode.data && dagNode.data.length > 0) {
      data = new Buffer(dagNode.data.length)
      dagNode.data.copy(data)
    }
    return data
  }

  static _cloneLinks(dagNode) {
    return dagNode.links.length > 0 ? dagNode.links.slice() : []
  }
}

exports = module.exports = DAGNodeFactory
