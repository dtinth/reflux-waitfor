'use strict'

const Reflux = require('reflux-core')
require('./').install(Reflux)

const test = require('tape')

test('simple example', assert => {
  // Consider the following equation:
  //
  //     A = X^2
  //     B = 2X
  //     C = A + B
  //
  // Here, X is an action, and A, B, C are stores that will react to that action.

  const Actions = Reflux.createActions([
    'setX'
  ])

  const C = Reflux.createStore({
    listenables: Actions,
    onSetX (x) {
      assert.ok(!A.value, 'A does not have a value before calling waitFor')
      assert.ok(!B.value, 'B does not have a value before calling waitFor')
      Reflux.waitFor(A)
      Reflux.waitFor(B)
      assert.ok(A.value, 'A now has a value')
      assert.ok(B.value, 'B now has a value')
      this.value = A.value + B.value
    }
  })

  const A = Reflux.createStore({
    listenables: Actions,
    onSetX (x) {
      this.value = x * x
    }
  })

  const B = Reflux.createStore({
    listenables: Actions,
    onSetX (x) {
      this.value = 2 * x
    }
  })

  Actions.setX.trigger(20)
  assert.equal(C.value, 440, 'C has the correct value')
  assert.end()
})

test('waitFor should assert that another store is actually interested', assert => {
  const Actions = Reflux.createActions([
    'test'
  ])

  Reflux.createStore({
    listenables: Actions,
    onTest () {
      Reflux.waitFor(B)
    }
  })

  const B = Reflux.createStore({
  })

  assert.throws(() => Actions.test.trigger())
  assert.end()
})
