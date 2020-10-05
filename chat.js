
var express = require('express');
var app = express();
var bodyparser = require('body-parser');
var mysql = require('mysql');
var file_upload = require('express-fileupload');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var busboy = require('then-busboy');
var md5 = require('md5');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var ejsLint = require('ejs-lint');
var fs = require('fs');
var localStorage = require('localStorage');
// var sharedsession = require("express-socket.io-session");

app.use('/assets', express.static('assets'));
app.use(express.static('public'));
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(file_upload());
// app.use(ejsLint);

app.use(cookieParser());
app.use(session({
  secret: "first_session",
  resave: true,
  name: "nishan",
  saveUninitialized: true
}));
var session_data;


// io.use(sharedsession(session));

var mysqlConnction = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'node_chat'
});

mysqlConnction.connect(function (error) {
  if (!error) {
    console.log("database connection successfully")
  } else {
    console.log("database connection error:" + error);
  }
});

var server_data = http.listen(2005, 'localhost', function (error) {
  if (!error) {
    var port = server_data.address().port;
    console.log('Port number ' + port + ' started here and run this code for http://localhost:' + port);
  } else {
    console.log('Port connection error:' + error);
  }
});
//  end port connection.


// chat system start here.

var users = new Array();
var user_tabs = new Array();

io.on('connection', function (socket) {
  console.log('connection with socket.io, completed');

  // here we defined user is joni a room
  if (socket.handshake.query.admin_id != undefined) {
    socket.join(socket.handshake.query.admin_id);

    if (user_tabs[socket.handshake.query.admin_id] == undefined) {
      user_tabs[socket.handshake.query.admin_id] = 1;
    } else {
      user_tabs[socket.handshake.query.admin_id]++;
    }
  }

  if (users[socket.handshake.query.admin_id] != undefined) {
    var new_length = users[socket.handshake.query.admin_id].length;
    users[socket.handshake.query.admin_id][new_length] = socket;
  } else {
    users[socket.handshake.query.admin_id] = new Array();
    users[socket.handshake.query.admin_id][0] = socket;
  }

  // admin_id is defined so then login status update here
  if (socket.handshake.query.admin_id != undefined) {
    // var index = user_tabs[socket.handshake.query.admin_id];
    // console.log(index);
    var date = new Date().getDate();
    var month = new Date().getMonth() + 1;
    var year = new Date().getUTCFullYear();
    var h = new Date().getHours();
    var m = new Date().getMinutes();
    var s = new Date().getSeconds();
    var c_date = year + '-' + month + '-' + date + ' ' + h + ':' + m + ':' + s;

    var sql = " update `register_user` set `user_status`=1, `status_active_time`=" + "'" + c_date + "'" + " where `user_id`=" + socket.handshake.query.admin_id;
    mysqlConnction.query(sql, (error) => {
      if (!error) {
        var all_user = "select * from `register_user` where `user_id`!=" + "'" + socket.handshake.query.admin_id + "'";
        mysqlConnction.query(all_user, (error, rows) => {
          login = new Array();
          login.push({ 'id': socket.handshake.query.admin_id, 'msg': "login", 'user_detail': rows });
          rows.forEach(function (ids) {
            // io.to(socket.handshake.query.admin_id).emit('admin_online', login);
            io.to(ids.user_id).emit('admin_online', login);
          });
          // console.log(login);
        });
        socket.emit('admin_online', 'login_successfully')
      }
    });

    socket.on('online', function (data) {
      var all_user = "select * from `register_user` where `user_id`!=" + "'" + socket.handshake.query.admin_id + "'";
      mysqlConnction.query(all_user, (error, rows) => {
        login = new Array();
        login.push({ 'id': socket.handshake.query.admin_id, 'msg': "login", 'user_detail': rows });
        rows.forEach(function (ids) {
          io.to(socket.handshake.query.admin_id).emit('admin_re_online', login);
          io.to(ids.user_id).emit('admin_re_online', login);
        });
        // console.log(login);
      });
    });

    socket.on('click_id', function (click_id) {
      var admin_id = socket.handshake.query.admin_id;
      // console.log(click_id);
      // console.log(chat_data_limit);
      var start = 0;
      var end = 10;
      // socket.handshake.session.click_id = click_id;
      // socket.handshake.session.save();
      var response = new Array();
      var condition = "(`from_id`=" + admin_id + " and `to_id`=" + click_id + " or `to_id`=" + admin_id + " and `from_id`=" + click_id + ")";
      // var sql = "select * from `chat` where "+condition+ "  ORDER BY `chat_id` DESC LIMIT "+start+","+end;
      var sql = "select * from ( select * from `chat` where " + condition + " ORDER BY `chat_id` desc LIMIT " + start + "," + end + ") sub ORDER BY `chat_id` ASC";
      console.log(sql);
      mysqlConnction.query(sql, (error, msg_rows) => {
        if (msg_rows) {
          var login_status = "select * from `register_user` where `user_id`=" + click_id;
          // console.log(login_status);
          mysqlConnction.query(login_status, (error, res_rows) => {
            if (res_rows) {
              response.push({ 'click_log_status': res_rows, 'each_msg': msg_rows });
              socket.emit('click_id_res', response);
              // console.log('not empty');
            }
          });
        } else {
          var login_status = "select * from `register_user` where `user_id`=" + click_id + " or `user_id`=" + admin_id;
          mysqlConnction.query(login_status, (res_rows) => {
            if (res_rows) {
              response.push({ 'click_log_status': res_rows, 'each_msg': msg_rows });
              socket.emit('click_id_res', response);
              // console.log('empty');
            }
          });
        }
      })
      // io.to(socket.handshake.query.admin_id).emit('click_id_res', res);
    });

    socket.on('scroll_more_data', function (click_id, limit) {
      // console.log(click_id+' '+limit);
      var admin_id = socket.handshake.query.admin_id;
      var end = 5;
      var start = end * (parseInt(limit) - 1);
      // console.log(start);
      var response = new Array();
      var condition = "(`from_id`=" + admin_id + " and `to_id`=" + click_id + " or `to_id`=" + admin_id + " and `from_id`=" + click_id + ")";
      // var sql = "select * from `chat` where "+condition+ "  ORDER BY `chat_id` DESC LIMIT "+start+","+end;
      var sql = "select * from ( select * from `chat` where " + condition + " ORDER BY `chat_id` desc LIMIT " + start + "," + end + ") sub ORDER BY `chat_id` ASC";
      // console.log(sql);
      mysqlConnction.query(sql, (error, msg_rows) => {
        if (msg_rows) {
          var login_status = "select * from `register_user` where `user_id`=" + click_id;
          // console.log(login_status);
          mysqlConnction.query(login_status, (error, res_rows) => {
            if (res_rows) {
              response.push({ 'click_log_status': res_rows, 'each_msg': msg_rows });
              socket.emit('scroll_more_data_on', response);
              // console.log('not empty');
            }
          });
        } else {
          var login_status = "select * from `register_user` where `user_id`=" + click_id + " or `user_id`=" + admin_id;
          mysqlConnction.query(login_status, (res_rows) => {
            if (res_rows) {
              response.push({ 'click_log_status': res_rows, 'each_msg': msg_rows });
              socket.emit('scroll_more_data_on', response);
              // console.log('empty');
            }
          });
        }
      })
    });

    socket.on('chat_data', function (data) {
      var admin_id = socket.handshake.query.admin_id;
      data.forEach(function (chats) {
        var date = new Date().getDate();
        var month = new Date().getMonth() + 1;
        var year = new Date().getUTCFullYear();
        var h = new Date().getHours();
        var m = new Date().getMinutes();
        var s = new Date().getSeconds();
        var c_date = year + '-' + month + '-' + date + ' ' + h + ':' + m + ':' + s;
        // console.log(year+'-'+month+'-'+date+' '+h+':'+m+':'+s);
        var res_data = new Array();
        var login_status = "select * from `register_user` where `user_id`=" + chats.to;
        // console.log(login_status);
        mysqlConnction.query(login_status, function (error, status) {
          if (!error) {
            // console.log(status[0]);
            var insert_chat_data = "INSERT INTO `chat`(`from_id`, `to_id`, `msg_status`, `txt_msg`, `date_time`) VALUES (" + chats.from + ", " + chats.to + ", 0," + "'" + chats.msg_data + "'" + ", " + "'" + c_date + "'" + ")";
            mysqlConnction.query(insert_chat_data, function (error) {
              if (!error) {
                // var condition = "(`from_id`="+chats.from+" and `to_id`= "+chats.to+" or `from_id`="+chats.to+" and `to_id`="+chats.from+")";
                // var sql = "select * from chat where "+condition;
                var start = 0;
                var end = 10;
                var sql = "select * from (select * from `chat` ORDER by `chat_id` desc LIMIT " + start + "," + end + ") sub ORDER by `chat_id` ASC";
                console.log(sql);
                mysqlConnction.query(sql, function (error, rows) {
                  if (!error) {
                    res_data.push({ 'user_profile': status, 'msg': rows });
                    io.to(admin_id).emit('chat_data_response', res_data);
                    io.to(chats.to).emit('chat_data_response', res_data);
                    // io.sockets.emit('chat_data_response', res_data);
                  } else {
                    console.log(error);
                  }
                });
              } else {
                console.log(error);
              }
            });
          }
        });
      });
    });

    // msg status
    socket.on('msg_status_1', function (data) {
      var admin_id = socket.handshake.query.admin_id;
      data.forEach(function (status) {
        // console.log(status);
        var sql = "select `user_id` from register_user where user_id != " + status.admin_id;
        // console.log(sql);
        mysqlConnction.query(sql, function (error, rows) {
          if (!error) {
            // console.log(rows);
            rows.forEach(function (data) {
              // console.log(data.user_id);
              var condition = "(`from_id`=" + data.user_id + " and `to_id`=" + status.admin_id + ")";
              var unread_msg = "select `chat_id` from `chat` where " + condition + " and `msg_status`=0";
              // console.log(unread_msg);
              mysqlConnction.query(unread_msg, function (error, rows) {
                if (!error) {
                  io.to(admin_id).emit('update', data.user_id, rows.length);
                  io.to(data.user_id).emit('update', data.user_id, rows.length);
                }
              });
            });
          }
        });
      });
    });

    socket.on('click_id_msg_status', function (data) {
      var admin_id = socket.handshake.query.admin_id;
      data.forEach(function (status) {
        var update = "update `chat` set `msg_status`=1 where `from_id`=" + status.click_id + " and `to_id`=" + status.admin_id;
        // console.log(update);
        mysqlConnction.query(update, function (error) {
          if (!error) {
            var sql = "select `user_id` from register_user where user_id != " + status.admin_id;
            // console.log(sql);
            mysqlConnction.query(sql, function (error, rows) {
              if (!error) {
                // console.log(rows);
                rows.forEach(function (data) {
                  // console.log(data);
                  var condition = "(`from_id`=" + data.user_id + " and `to_id`=" + status.admin_id + ")";
                  var unread_msg = "select `chat_id` from `chat` where " + condition + " and `msg_status`=0";
                  // console.log(unread_msg);
                  mysqlConnction.query(unread_msg, function (error, rows) {
                    if (!error) {
                      io.to(admin_id).emit('click_id_msg_status_update', data.user_id, rows.length);
                      io.to(status.click_id).emit('click_id_msg_status_update', data.user_id, rows.length);
                    }
                  });
                });
              }
            });
          } else {
            console.log(error);
          }
        });
      });
    });

    socket.on('read_unread', function (data) {
      var admin_id = socket.handshake.query.admin_id;
      var sql = "select `user_id` from register_user where user_id != " + admin_id;
      // console.log(sql);
      mysqlConnction.query(sql, function (error, rows) {
        if (!error) {
          // console.log(rows);
          rows.forEach(function (data) {
            // console.log(data);
            var condition = "(`from_id`=" + admin_id + " and `to_id`=" + data.user_id + ")";
            var unread_msg = "select `chat_id` from `chat` where " + condition + " and `msg_status`=0";
            // console.log(unread_msg);
            mysqlConnction.query(unread_msg, function (error, rows) {
              if (!error) {
                io.to(admin_id).emit('read_unread_update', data.user_id, rows.length);
                io.to(data.user_id).emit('read_unread_update', data.user_id, rows.length);
              }
            });
          });
        }
      });
    });

    socket.on('header_menu', function (data) {
      if (data) {
        var admin_id = socket.handshake.query.admin_id;
        var all_user = "select * from `register_user` where `user_id`!=" + admin_id;
        mysqlConnction.query(all_user, function (error, rows) {
          if (!error) {
            rows.forEach(function (data) {
              var condition = "(`from_id`=" + data.user_id + " and `to_id`=" + admin_id + ")";
              var msg_count = "select * from `chat` where " + condition + " and `msg_status`=0";
              // console.log(msg_count);
              mysqlConnction.query(msg_count, function (error, res_data) {
                if (res_data.length > 0) {
                  io.to(admin_id).emit('header_response', data, res_data.length);
                  // io.to(data.user_id).emit('header_response', data, res_data.length);
                }
              });
            });
          }
        });
        // console.log(data);
      }
    });

  }

  // disconnect module start here
  socket.on('disconnect', function () {
    if (socket.handshake.query.admin_id != undefined) {
      user_tabs[socket.handshake.query.admin_id]--;
      if (user_tabs[socket.handshake.query.admin_id] == 0) {

        var all_user = "select * from `register_user` where `user_id`!=" + "'" + socket.handshake.query.admin_id + "'";
        mysqlConnction.query(all_user, (error, rows) => {
          rows.forEach(function (ids) {
            // io.to(socket.handshake.query.admin_id).emit('admin_offline', 'offline'+"'"+socket.handshake.query.admin_id+"'");
            io.to(ids.user_id).emit('admin_offline', 'offline' + "'" + socket.handshake.query.admin_id + "'");
          });
        });
        auto_logout(socket.handshake.query.admin_id);
      }
    } else {
      mysqlConnction.query(" update `register_user` set `user_status`=1 where `user_id`=" + socket.handshake.query.admin_id);
    }
  });

  function auto_logout(handshake_admin_id) {

    var date = new Date().getDate();
    var month = new Date().getMonth() + 1;
    var year = new Date().getUTCFullYear();
    var h = new Date().getHours();
    var m = new Date().getMinutes();
    var s = new Date().getSeconds();
    var c_date = year + '-' + month + '-' + date + ' ' + h + ':' + m + ':' + s;
    mysqlConnction.query(" update `register_user` set `user_status`=0, `status_active_time`=" + "'" + c_date + "'" + " where `user_id`=" + socket.handshake.query.admin_id);
  }
  // end of disconnect
});
// chat system end here.

// get chat page
app.get('/chat_page', function (req, res) {
  console.log("chat page get");
  var login_data = req.session.user;
  if (login_data != undefined) {
    res.render('chat/chat_page.ejs', { user_session: login_data });
  } else {
    res.redirect('/');
  }
});
app.get('/register', function (req, res) {
  console.log('register page get and call');
  var login_data = req.session.user;
  if (login_data != undefined) {
    res.redirect('/dashboard');
  } else {
    res.render('register.ejs', {
      error_msg: '',
      session_value: session_data
    });
  }
});

//  register module stat here.

app.get('/', function (req, res) {
  // session_data = req.session;
  // console.log(session_data);
  var login_data = req.session.user;
  if (login_data != undefined) {
    res.redirect('/dashboard');
  } else {
    console.log("login file get successfully");
    res.render('login.ejs', {
      error_msg: '',
    });
  }
});


app.post('/', function (req, res) {

  if (req.method == 'POST') {
    console.log('data submit at post method');
    var UserName = req.body.username;
    var Email = req.body.email;
    var PassWord = md5(req.body.password);
    var R_PassWord = md5(req.body.r_password);
    var file = req.files.user_photo;
    var image_name = path.basename(file.name, path.extname(file.name)) + "_" + UserName + "_" + Math.random() + path.extname(file.name);
    if (PassWord == R_PassWord) {
      var sql = "select * from register_user where `user_email` = " + "'" + Email + "'";
      mysqlConnction.query(sql, (error, rows) => {
        if (!error) {
          if (rows.length == 0) {
            if (file.mimetype == 'image/png' || file.mimetype == 'image/jpeg' || file.mimetype == 'image/gif') {
              file.mv('./assets/images/users/' + image_name, (error) => {
                if (!error) {
                  var sql = "insert into `register_user`(`user_file`, `user_username`, `user_email`, `user_password`) Values(" + "'" + image_name + "'" + ", " + "'" + UserName + "'" + ", " + "'" + Email + "'" + ", " + "'" + PassWord + "'" + ")";
                  mysqlConnction.query(sql, (error) => {
                    if (!error) {
                      console.log('data insert successfully');
                      res.redirect('/');
                    } else {
                      console.log('data insert un-successfully');
                    }
                  });

                } else {
                  console.log('file upload error:' + error);
                }
              });
            } else {
              // console.log(session_data.UserName);
              console.log('file extension is not valid');
              res.render('register.ejs', {
                error_msg: 'File extension is not valid',
                session_value: session_data
              });
            }
          } else {
            console.log('this email already exit.');
            res.render('register.ejs', {
              error_msg: 'This email already exit.',
              session_value: session_data
            });
          }
        }
      });
    } else {
      console.log('Password not match');
      res.render('register.ejs', {
        error_msg: 'Password not match',
        session_value: session_data
      })
    }
  } else {
    console.log("other method");
  }
});

//  register module end here.

// login module stat here.
app.post('/verify_login', (req, res) => {
  // console.log(req.body);
  var l_UserName = req.body.username.trim();
  var l_PassWord = md5(req.body.password);
  console.log(l_UserName + l_PassWord);
  var sql = "select * from register_user where user_username = " + "'" + l_UserName + "'" + " and user_password = " + "'" + l_PassWord + "'";
  mysqlConnction.query(sql, function (error, rows) {
    if (!error) {
      if (rows.length != 0) {
        req.session.user = rows;
        res.redirect('/dashboard');
      } else {
        // return res.status(401).send();
        res.render('login.ejs', {
          error_msg: 'Password and Username invalid'
        });
      }
    } else {
      console.log('Data get error:' + error);
    }
  });
});
// login module end here.

// after seccessfully login.
app.get('/dashboard', (req, res) => {

  var login_data = req.session.user;
  if (login_data != undefined) {
    // here update user login status
    login_data.forEach(function (update_id) {
      var sql = "update `register_user` set `user_status` = 1 where `user_id`=" + update_id.user_id;
      // console.log(sql);
      mysqlConnction.query(sql, function (error) {
        if (!error) {
          res.render('chat/dashboard.ejs', { user_session: login_data });
        } else {
          res.redirect('/');
        }
      });
      // console.log(__dirname);
    });
  } else {
    console.log('session is empty here');
    res.redirect('/');
  }
});
// port connection.

// logout partl
app.get('/logout', (req, res) => {
  var login_data = req.session.user;
  login_data.forEach(function (update_id) {
    var sql = "update `register_user` set `user_status` = 0 where `user_id`=" + update_id.user_id;
    console.log(sql);
    mysqlConnction.query(sql, function (error) {
      if (!error) {
        if (req.session.destroy()) {
          res.redirect('/');
        }
      } else {
        res.redirect('/dashboard');
      }
    });
    // console.log(__dirname);
  });

});
// logout complet here

// change_profile here

app.get('/change_profile_view', (req, res) => {

  var login_data = req.session.user;
  if (login_data != undefined) {
    res.render('chat/user_profile.ejs', { user_session: login_data });
  } else {
    res.redirect('/');
  }
});

app.post('/change_profile_update', (req, res) => {

  var login_data = req.session.user;
  if (login_data != undefined) {
    if (req.method == 'POST') {
      // req.session.destroy();
      var file = req.files.new_photo;
      if (file == undefined) {
        var UserName = req.body.username;
        var Email = req.body.email;
        var Id = req.body.user_id;
        var sql = "update `register_user` set `user_username`=" + "'" + UserName + "'" + ", `user_email`=" + "'" + Email + "'" + " where `user_id`=" + Id;
        mysqlConnction.query(sql, (error) => {
          if (!error) {
            var sql1 = "select * from `register_user` where `user_id`=" + Id;
            mysqlConnction.query(sql1, function (error, rows) {
              // res.redirect('/dashboard');
              req.session.reload(function (err) {
                req.session.user = rows;
                res.redirect('/dashboard');
              });
              // res.render('chat/dashboard.ejs', {user_session : login_data})
            });
          }
        });
      } else {
        var UserName = req.body.username;
        var Email = req.body.email;
        var Id = req.body.user_id;
        var Old_file = req.body.old_photo;
        var New_file = req.files.new_photo;
        var name_of_file = path.basename(New_file.name, path.extname(New_file.name)) + "_" + UserName + "_" + Math.random() + path.extname(New_file.name);
        if (New_file.mimetype == "image/jpeg" || New_file.mimetype == "image/png" || New_file.mimetype == "image/gif") {
          if (Old_file) {
            fs.unlink('./assets/images/users/' + Old_file, (error) => {
              if (!error) {
              } else {
                console.log('image unlink error:' + error);
              }
            });
          }
          New_file.mv('./assets/images/users/' + name_of_file, function (error) {
            if (!error) {
              var sql = "update `register_user` set `user_username`=" + "'" + UserName + "'" + ", `user_email`=" + "'" + Email + "'" + ", `user_file`=" + "'" + name_of_file + "'" + " where `user_id`=" + Id;
              mysqlConnction.query(sql, (error) => {
                if (!error) {
                  var sql1 = "select * from `register_user` where `user_id`=" + Id;
                  mysqlConnction.query(sql1, function (error, rows) {
                    req.session.reload(function (err) {
                      if (!err) {
                        req.session.user = rows;
                        res.redirect('/dashboard');
                        return false;
                      } else {
                        console.log('session reload error:' + err);
                      }
                    });
                  });
                }
              });
            } else {
              console.log("image upload error:" + error);
            }
          });
        } else {
          console.log('file extension is not valide');
        }
      }
    }
  } else {
    res.redirect('/');
  }

});
// change_profile end here

// change password here, usering ajax response
app.get('/change_password_view', function (req, res) {
  var login_data = req.session.user;
  if (login_data != undefined) {
    res.render('chat/change_password.ejs', { user_session: login_data });
  } else {
    res.redirect('/');
  }
});
app.post('/change_password_update', function (req, res) {
  var login_data = req.session.user;
  if (login_data != undefined) {
    if (req.method == 'POST') {
      req.session.password = req.body;
      var OldPass = md5(req.body.o_password);
      var NewPass = md5(req.body.n_password);
      var RePass = md5(req.body.r_password);
      var Id = req.body.user_id;
      var check_sql = "select * from `register_user` where `user_id`=" + "'" + Id + "'" + " and `user_password`=" + "'" + OldPass + "'";
      // console.log(check_sql);
      mysqlConnction.query(check_sql, (error, rows) => {
        if (rows.length != 0) {
          if (NewPass == RePass) {
            var pass_up = "update `register_user` set `user_password` =" + "'" + NewPass + "'" + " where `user_id`=" + Id;
            mysqlConnction.query(pass_up, (error) => {
              if (!error) {
                // req.session.destroy();
                // res.redirect('/dashboard');
                var msg = true;
                res.send(msg);
              }
            });
          } else {
            var msg = 'Password not match';
            res.send(msg);
          }
        } else {
          var msg = 'Old password not match';
          res.send(msg);
        }
      });
    }
  } else {
    res.redirect('/');
  }
});
// change password end here
