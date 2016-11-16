'use strict'

const mh = require('multihashes')
const assert = require('assert')

const ImmutableError = new Error('Immutable property')

class DAGNode {
  constructor (data, links, serialized, multihash) {
    assert(serialized, 'DAGNode needs its serialized format')
    assert(multihash, 'DAGNode needs its multihash')

    if (typeof multihash === 'string') {
      multihash = mh.fromB58String(multihash)
    }

    this._data = data || new Buffer(0)
    this._links = links || []
    this._serialized = serialized || new Buffer(0) // TODO: default serialized object
    this._multihash = multihash || new Buffer(0) // TODO: default multihash object
    this._size = this.links.reduce((sum, l) => sum + l.size, this.serialized.length)
    this._json = {
      data: this.data,
      links: this.links.map((l) => l.json),
      hash: mh.toB58String(this.multihash),
      size: this.size
    }
  }

  toJSON () {
    return this._json
  }

  toString () {
    const mhStr = mh.toB58String(this.multihash)
    return `DAGNode <${mhStr} - data: "${this.data.toString()}", links: ${this.links.length}, size: ${this.size}>`
  }

  get data () {
    return this._data
  }

  set data (data) {
    throw ImmutableError
  }

  get links () {
    return this._links
  }

  set links (links) {
    throw ImmutableError
  }

  get serialized () {
    return this._serialized
  }

  set serialized (serialized) {
    throw ImmutableError
  }

  get size () {
    return this._size
  }

  set size (size) {
    throw ImmutableError
  }

  get multihash () {
    return this._multihash
  }

  set multihash (multihash) {
    throw ImmutableError
  }
}

exports = module.exports = DAGNode
