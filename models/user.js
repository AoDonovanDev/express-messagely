const { BCRYPT_WORK_FACTOR } = require("../config");
const client = require("../db");
const ExpressError = require('../expressError')
const bcrypt = require("bcrypt")


/** User class for message.ly */



/** User of the site. */

class User {
  constructor({username, password, first_name, last_name, phone}) {
    this.username = username;
    this.password = password;
    this.first_name = first_name;
    this.last_name = last_name;
    this.phone = phone;
  }
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */
  static async register({username, password, first_name, last_name, phone}) {

    const user = await User.get(username)
    if(user) throw new ExpressError('taken', 401)
    const hashedPw = await bcrypt.hash(password, BCRYPT_WORK_FACTOR)
    const joinAt = new Date()
    const results = await client.query(`
      INSERT INTO users (username, password, first_name, last_name, phone, join_at) VALUES ($1,$2,$3,$4,$5,$6)
    `, [username, hashedPw, first_name, last_name, phone, joinAt])
    await User.updateLoginTimestamp(username)
    return {username, password, first_name, last_name, phone}
    
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 

    const user = await client.query(`
      SELECT password FROM users WHERE username = $1
    `, [username]);
    console.log(user)
    if(!user) throw new ExpressError('username has not been registered yet')

    const auth = await bcrypt.compare(password, user.rows[0].password);
    return auth

  }
  /** Update last_login_at for user */


  static async updateLoginTimestamp(username) { 

    const now = new Date()
    const result = await client.query(`
      UPDATE users SET last_login_at=$1 WHERE username=$2
    `, [now, username])
    return result.rows[0]
   }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() { 
    const result = await client.query(`
      SELECT * FROM users
    `)
    const allUsers = result.rows.map(function(u){
      return {
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone
      }
    })
    return allUsers
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) { 

    const userInfo = await client.query(`
      SELECT username, first_name, last_name, phone, join_at, last_login_at FROM users WHERE username = $1;
    `, [username])

   return userInfo.rows[0]
  }
  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 

    const messages = await client.query(`
      SELECT m.id, m.to_username as to_user, m.body, m.sent_at, m.read_at
      FROM messages AS m
      JOIN users AS u
      ON u.username = m.from_username
      WHERE m.from_username = $1
    `, [username])
    let fromMsgs = messages.rows

    async function getSpecificInfoNeededToPassTest(msg){
        const result = await User.get(msg.to_user)
        const user = result
        return msg.to_user = {
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone
          }
      }

    
    for(let msg of fromMsgs){
      await getSpecificInfoNeededToPassTest(msg)
    }
    
    return fromMsgs

   }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) { 

     const messages = await client.query(`
      SELECT m.id, m.from_username as from_user, m.body, m.sent_at, m.read_at
      FROM messages AS m
      JOIN users AS u
      ON u.username = m.to_username
      WHERE m.to_username = $1
    `, [username])

    let toMsgs = messages.rows
    async function getSpecificInfoNeededToPassTest(msg){
        const result = await User.get(msg.from_user)
        const user = result
        return msg.from_user = {
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone
          }
      }

    for(let msg of toMsgs){
      await getSpecificInfoNeededToPassTest(msg)
    }

    return toMsgs

   }
}


module.exports = User;