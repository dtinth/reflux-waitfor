
reflux-waitfor
==============

This project implements `Reflux.waitFor(AnotherStore)` that works like [Dispatcher.waitFor()](https://facebook.github.io/flux/docs/dispatcher.html).


## Usage

```js
const Reflux = require('reflux')

require('reflux-waitfor').install(Reflux)
```

In store action handlers:

```js
const UnreadCountStore = Reflux.createStore({
  // ...

  onMessageReceive (data) {
    Reflux.waitFor(MessageStore)
    this.count = MessageStore.getAllMessages().filter(isUnread).length
    this.trigger()
  },

  // ...
```

See [example.js](example.js) for more example.

See [test.js](test.js) for even more example.


## LICENSE

MIT
