'use strict'

const stable = require('stable')
const sort = stable.inplace
// const mh = require('multihashes')
const protobuf = require('protocol-buffers')
const proto = protobuf(require('./dag.proto'))
const util = require('./util')
const DAGNode = require('./dag-node')
const DAGLink = require('./dag-link')

class DAGNodeFactory {
  static create (data, dagLinks, hashAlg, callback) {
    if (typeof data === 'function') {
      // empty obj
      callback = data
      data = undefined
    }
    if (typeof dagLinks === 'function') {
      // empty obj
      callback = dagLinks
      dagLinks = []
    }
    if (typeof hashAlg === 'function') {
      // empty obj
      callback = hashAlg
      hashAlg = undefined
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

    // Sort the links (in-place)
    sort(links, util.linkSort)

    DAGNodeFactory._serialize({
      data: data,
      links: links
    }, (err, serialized) => {
      if (err) {
        callback(err)
      }
      util.hash(hashAlg, serialized, (err, multihash) => {
        if (err) {
          callback(err)
        }
        const dagNode = new DAGNode(data, links, serialized, multihash)
        callback(null, dagNode)
      })
    })
  }

  static addLink (dagNode, nameOrLink, nodeOrMultihash, callback) {
    const links = DAGNodeFactory._cloneLinks(dagNode)
    const data = DAGNodeFactory._cloneData(dagNode)
    let newLink = null

    if ((nameOrLink.constructor &&
         nameOrLink.constructor.name === 'DAGLink')) {
      // It's a link
      newLink = nameOrLink
    } else if (typeof nameOrLink === 'string') {
      // It's a name
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

    if (newLink) {
      links.push(newLink)
      sort(links, util.linkSort)
    } else {
      throw new Error('Link given as the argument is invalid')
    }

    DAGNodeFactory.create(data, links, callback)
  }

  static removeLink (dagNode, nameOrMultihash, callback) {
    let data = DAGNodeFactory._cloneData(dagNode)
    let links = DAGNodeFactory._cloneLinks(dagNode)

    if (typeof nameOrMultihash === 'string') {
      links = dagNode.links.filter((link) => link.name !== nameOrMultihash)
    } else if (Buffer.isBuffer(nameOrMultihash)) {
      links = dagNode.links.filter((link) => !link.hash.equals(nameOrMultihash))
    } else {
      throw new Error('second arg needs to be a name or multihash')
    }

    DAGNodeFactory.create(data, links, callback)
  }

  /*
   * toDAGLink converts a DAGNode to a DAGLink
   */
  // was: makeLink(node, callback)
  static toDAGLink (dagNode) {
    return new DAGLink(null, dagNode.size, dagNode.multihash)
  }

  static clone (dagNode, callback) {
    const data = DAGNodeFactory._cloneData(dagNode)
    const links = DAGNodeFactory._cloneLinks(dagNode)
    DAGNodeFactory.create(data, links, callback)
  }

  static _cloneData (dagNode) {
    let data = new Buffer(0)
    if (dagNode.data && dagNode.data.length > 0) {
      data = new Buffer(dagNode.data.length)
      dagNode.data.copy(data)
    }
    return data
  }

  static _cloneLinks (dagNode) {
    return dagNode.links.length > 0 ? dagNode.links.slice() : []
  }

  static _serialize (node, callback) {
    let serialized

    try {
      const pb = DAGNodeFactory.toProtoBuf(node)
      serialized = proto.PBNode.encode(pb)
    } catch (err) {
      return callback(err)
    }

    callback(null, serialized)
  }

  static _deserialize (data, callback) {
    const pbn = proto.PBNode.decode(data)

    const links = pbn.Links.map((link) => {
      return new DAGLink(link.Name, link.Tsize, link.Hash)
    })

    sort(links, util.linkSort)

    const buf = pbn.Data || new Buffer(0)

    DAGNodeFactory.create(buf, links, callback)
  }

  static toProtoBuf (node) {
    const pbn = {}

    if (node.data && node.data.length > 0) {
      pbn.Data = node.data
    } else {
      pbn.Data = null // new Buffer(0)
    }

    if (node.links.length > 0) {
      pbn.Links = node.links.map((link) => {
        return {
          Hash: link.hash,
          Name: link.name,
          Tsize: link.size
        }
      })
    } else {
      pbn.Links = null
    }

    return pbn
  }
}

exports = module.exports = DAGNodeFactory
