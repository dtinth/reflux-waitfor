
var invariant = require('invariant')

var LISTENER_KEY = '@@reflux-waitfor/LISTENER'

// Generate an internal error text.
//
function internalError (text) {
  return ('reflux-waitfor: ' +
    text + ' ' +
    'This is most likely a bug in reflux-waitfor. ' +
    'Please contribute a test case!'
  )
}

// Utility: Monkey patch a method.
//
// http://me.dt.in.th/page/JavaScript-override/
//
function override (object, method, f) {
  object[method] = f(object[method])
}

// Installs Reflux.waitFor() and perform necessary monkey-patching to make it
// work.
//
exports.install = function (Reflux) {
  invariant(!Reflux.waitFor, 'reflux-waitfor: ' +
    'Reflux.waitFor() already exists.'
  )

  // This stack is used to keep track of all active triggers.
  //
  var _stack = [ ]

  // Deliver the action trigger to another listener first before returning.
  //
  Reflux.waitFor = function waitFor (anotherListener) {
    invariant(_stack.length, 'reflux-waitfor: ' +
      'Reflux.waitFor() must be called during an action trigger.'
    )
    var currentContext = _stack[_stack.length - 1]
    var count = currentContext.waitFor(anotherListener)
    invariant(count > 0, 'reflux-waitfor: ' +
      'Reflux.waitFor() failed. ' +
      'This most likely happens because the other listener is not actually ' +
      'listening to this action.'
    )
  }

  override(Reflux.PublisherMethods, 'trigger', function (originalTrigger) {
    return function () {
      // When a publisher (action) triggers, we create a new TriggerContext for
      // this “trigger”.  The TriggerContext is able to keep track of whether
      // a listener’s callback is invoked or not.
      //
      // We put the a TriggerContext to temporarily stand in place of the
      // EventEmitter.
      //
      try {
        var emitter = this.emitter
        var triggerContext = new TriggerContext(emitter)
        _stack.push(triggerContext)
        this.emitter = triggerContext
        return originalTrigger.apply(this, arguments)
      } finally {
        this.emitter = emitter
        _stack.pop()
      }
    }
  })

  override(Reflux.PublisherMethods, 'listen', function (originalListen) {
    return function (callback, bindContext) {
      // If `bindContext === this`, then there are two most likely cases:
      //
      // - `Action.listen` has been called directly instead of using the more
      //   preferred way with `Store.listenTo()`.
      //
      //   In this case, we don’t have access to the store instance, therefore,
      //   we can’t do anything here.  You should use `Store.listenTo()`.
      //
      // - `Store.listen` has been called. In this case, everything is alright!
      //
      if (bindContext === this) {
        return originalListen.call(this, callback, bindContext)
      }

      // Otherwise, `bindContext` IS the store (listener) that listens to the
      // action (publisher).  We wrap the callback so that if the current
      // TriggerContext has already invoked the callback, it will not be
      // invoked again.
      //
      var listener = bindContext
      var unsubscribe = originalListen.call(this,
        wrapCallback(callback, listener),
        bindContext
      )

      // Here comes an ugly hack.
      //
      // Because Reflux’s `.listen()` method wraps the callback function into
      // another closure (called `eventHandler`), we lose the linkage from the
      // callback function back to the store.
      //
      // Therefore, we need to find the most recently-added event handler, and
      // link it back to the store.
      //
      linkLatestEventHandlerToListener(this.emitter, this.eventLabel, listener)
      return unsubscribe
    }
  })

  return Reflux

  // This is a very ugly hack to make sure that the most recently-added
  // event handler can be linked back to the store.
  //
  function linkLatestEventHandlerToListener (emitter, eventLabel, listener) {
    var handlers = emitter.listeners(eventLabel)
    invariant(handlers.length,
      internalError('A handler must already have been added at this point.')
    )
    handlers[handlers.length - 1][LISTENER_KEY] = listener
  }

  // This wrapCallback makes sure that a trigger from the current TriggerContext
  // will only arrive the real callback function once.
  //
  // We need this because the callback can be invoked in two circumstances:
  //
  // - Normal trigger.
  // - waitFor() call from another store.
  //
  function wrapCallback (callback, listener) {
    function resultingCallback () {
      invariant(_stack.length,
        internalError('No action seem to be dispatching.')
      )
      var currentContext = _stack[_stack.length - 1]
      if (currentContext.hasAlreadyReceived(listener)) {
        return
      }
      currentContext.markAsReceived(listener)
      return callback.apply(this, arguments)
    }
    return resultingCallback
  }
}

function TriggerContext (emitter) {
  this._emitter = emitter
  this._emitted = false
  this._received = [ ]
}

TriggerContext.prototype.emit = function (eventLabel, args) {
  invariant(!this._emitted,
    internalError('TriggerContext.emit() has been called more than once.')
  )
  this._emitted = true
  this._eventLabel = eventLabel
  this._args = args
  this._emitter.emit(eventLabel, args)
}

TriggerContext.prototype.markAsReceived = function (listener) {
  invariant(this._emitted,
    internalError('TriggerContext.markAsReceived() must not be called before emit().')
  )
  this._received.push(listener)
}

TriggerContext.prototype.hasAlreadyReceived = function (listener) {
  invariant(this._emitted,
    internalError('TriggerContext.hasAlreadyReceived() must not be called before emit().')
  )
  return this._received.some(function (currentListener) {
    return listener === currentListener
  })
}

TriggerContext.prototype.waitFor = function (listener) {
  invariant(this._emitted,
    internalError('TriggerContext.waitFor() must not be called before emit().')
  )
  var handlers = this._emitter.listeners(this._eventLabel)
  var matchingHandlers = handlers.filter(function (handler) {
    return handler[LISTENER_KEY] === listener
  })
  var args = this._args
  matchingHandlers.forEach(function (handler) {
    handler(args)
  })
  return matchingHandlers.length
}
