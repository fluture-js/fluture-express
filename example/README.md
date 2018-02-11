# Fluture Express Example

This tiny exress application shows most of the different usecases of Fluture Express.

To run it, type:

```shell
node index.js
```

And then you can visit;

* `localhost:3000/` to see the welcome message
* `localhost:3000/image?file=cat.jpeg` to see the cat

You can also manupulate the welcome message by setting the
`X-Authenticated-User` header.

----

These two endpoints are implemented in terms of three actions:

1. `actions/session.js` - Assigns some state to `res.locals` based on a header.
   This is an example of using the `Next` response type.
2. `actions/welcome.js` - Responds with some JSON based on the state set by
   the session middleware. This is an example of using previously defined state
   and using the `Json` response type.
3. `actions/image.js` - Responds with a requested image. This is a more
   involved example showing asynchronous processing, using the `Stream`
   response type and handling error cases.
