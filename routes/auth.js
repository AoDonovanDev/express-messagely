
const express = require("express");
const router = new express.Router();

const jwt = require("jsonwebtoken");

const { SECRET_KEY } = require("../config");
const User = require('../models/user')
const ExpressError = require("../expressError");





/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post("/login", async function(req, res, next) {
  try {
    const { username, password } = req.body;
    const existingUser = await User.get(username)
    if(!existingUser){
      throw new ExpressError('he dont exist', 400)
    }
    const isValid = await User.authenticate(username, password)
    if (isValid) {
      await User.updateLoginTimestamp(username)
      let token = jwt.sign({ username }, SECRET_KEY);
      return res.json({ token });
      }
    throw new ExpressError("Invalid user/password", 400);
  } catch (err) {
    return next(err);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async function(req, res, next){
  try {
    const { username, password, first_name, last_name, phone } = req.body;
    if (!username || !password) {
      throw new ExpressError("Username and password required", 400);
    }
    const newUser = await User.register({username, password, first_name, last_name, phone})
    let token = jwt.sign({ username }, SECRET_KEY);
    return res.json({ token });
  } catch (e) {
    if (e.code === '23505') {
      return next(new ExpressError("Username taken. Please pick another!", 400));
    }
    return next(e)
  }
});

module.exports = router