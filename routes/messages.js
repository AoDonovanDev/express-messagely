
const express = require("express");
const router = new express.Router();

const User = require('../models/user')
const Message = require('../models/message')
const ExpressError = require("../expressError");
const {ensureLoggedIn, ensureCorrectUser} = require('../middleware/auth')


/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get('/:id', ensureLoggedIn, ensureCorrectUser, async(req, res, next) => {
  const msgid = req.params.id
  const user = req.params.user.username
  const msg = await Message.get(msgid)
   if(! (user == msg.from_user.username || user == msg.to_username) ){
    throw new ExpressError('ya caint view that', 401)
   }
  return res.json({ msg: msg})

  /* {
      id: m.id,
      from_user: {
        username: m.from_username,
        first_name: m.from_first_name,
        last_name: m.from_last_name,
        phone: m.from_phone,
      },
      to_user: {
        username: m.to_username,
        first_name: m.to_first_name,
        last_name: m.to_last_name,
        phone: m.to_phone,
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
    }; */
})






/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", ensureLoggedIn, async function(req, res, next) {
  try {
    const from_username = req.user.username
    const { to_username, body } = req.body;
    const newMessage = await Message.create({from_username, to_username, body})
    return res.json({message: newMessage})
  } catch (err) {
    return next(err);
  }
});



/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/

router.post('/:id/read', ensureLoggedIn, async(req, res, next) => {
  try{
    const username = req.user.username
    const msgid = req.params.id
    const msg = await Message.get(msgid)
    if(msg.to_user.username == username){
      const readMsg = await Message.markRead(msgid)
      return res.json({ messages: readMsg})
    }
    throw new ExpressError('who are ye', 401)
  }
  catch(e){
    next(e)
  }
})

module.exports = router