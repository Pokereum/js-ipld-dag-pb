'use strict'

const stable = require('stable')
const sort = stable.inplace
const mh = require('multihashes')
const assert = require('assert')
const util = require('./util')
const DAGLink = require('./dag-link')

const ImmutableError = new Error('Immutable property')

class DAGNode {
  constructor (data, links, serialized, multihash) {
    // Should these be "throw new Error()" instead?
    assert(serialized, 'DAGNode needs its serialized format')
    assert(multihash, 'DAGNode needs its multihash')

    if (typeof multihash === 'string') {
      multihash = mh.fromB58String(multihash)
    }

    this._data = data || new Buffer(0)
    this._links = links || []
    this._serialized = serialized || new Buffer(0) // TODO: default serialized object
    this._multihash = multihash || new Buffer(0) // TODO: default multihash object
  }

  toJSON() {
    return {
      data: this.data,
      links: this.links.map((l) => l.json),
      hash: mh.toB58String(this.multihash),
      size: this.size
    }
  }

  toString () {
    const mhStr = mh.toB58String(this.multihash)
    return `DAGNode <${mhStr} - data: "${this.data.toString()}", links: ${this.links.length}, size: ${this.size}>`
  }

  get data() {
    return this._data
  }

  set data() {
    throw ImmutableError
  }

  get links() {
    return this._links
  }

  set links() {
    throw ImmutableError
  }

  get serialized() {
    return this._serialized
  }

  set serialized() {
    throw ImmutableError
  }

  get size() {
    return this.links.reduce((sum, l) => sum + l.size, this.serialized.length)
  }

  set size() {
    throw ImmutableError
  }

  get multihash() {
    return this._multihash
  }

  set multihash() {
    throw ImmutableError
  }
}

exports = module.exports = DAGNode
