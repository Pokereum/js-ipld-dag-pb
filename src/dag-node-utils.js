'use strict'

const stable = require('stable')
const sort = stable.inplace
const protobuf = require('protocol-buffers')
const proto = protobuf(require('./dag.proto'))
const util = require('./util')
const DAGNode = require('./dag-node')
const DAGLink = require('./dag-link')

function create (data, dagLinks, hashAlg, callback) {
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

  serialize({
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

function addLink (dagNode, nameOrLink, nodeOrMultihash, callback) {
  const links = _cloneLinks(dagNode)
  const data = _cloneData(dagNode)
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
      newLink = toDAGLink(nodeOrMultihash)
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

  create(data, links, callback)
}

function removeLink (dagNode, nameOrMultihash, callback) {
  let data = _cloneData(dagNode)
  let links = _cloneLinks(dagNode)

  if (typeof nameOrMultihash === 'string') {
    links = dagNode.links.filter((link) => link.name !== nameOrMultihash)
  } else if (Buffer.isBuffer(nameOrMultihash)) {
    links = dagNode.links.filter((link) => !link.hash.equals(nameOrMultihash))
  } else {
    throw new Error('second arg needs to be a name or multihash')
  }

  create(data, links, callback)
}

/*
 * toDAGLink converts a DAGNode to a DAGLink
 */
// was: makeLink(node, callback)
function toDAGLink (dagNode) {
  return new DAGLink(null, dagNode.size, dagNode.multihash)
}

function clone (dagNode, callback) {
  const data = _cloneData(dagNode)
  const links = _cloneLinks(dagNode)
  create(data, links, callback)
}

function serialize (node, callback) {
  let serialized

  try {
    const pb = toProtoBuf(node)
    serialized = proto.PBNode.encode(pb)
  } catch (err) {
    return callback(err)
  }

  callback(null, serialized)
}

function deserialize (data, callback) {
  const pbn = proto.PBNode.decode(data)

  const links = pbn.Links.map((link) => {
    return new DAGLink(link.Name, link.Tsize, link.Hash)
  })

  sort(links, util.linkSort)

  const buf = pbn.Data || new Buffer(0)

  create(buf, links, callback)
}

function toProtoBuf (node) {
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

function _cloneData (dagNode) {
  let data = new Buffer(0)
  if (dagNode.data && dagNode.data.length > 0) {
    data = new Buffer(dagNode.data.length)
    dagNode.data.copy(data)
  }
  return data
}

function _cloneLinks (dagNode) {
  return dagNode.links.length > 0 ? dagNode.links.slice() : []
}

exports.create = create
exports.addLink = addLink
exports.removeLink = removeLink
exports.toDAGLink = toDAGLink
exports.toProtoBuf = toProtoBuf
exports.serialize = serialize
exports.deserialize = deserialize
exports.clone = clone
