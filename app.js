var colors = require('colors');
colors.setTheme({
  input: 'grey',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});


console.log('================================================================'.data);
console.log('================================================================'.data);
console.log("");
console.log('Running PMX CHAT Server'.data);
console.log('Copyright (c) 2016 ProcessMX'.data);
console.log("");  
console.log('================================================================'.data);
console.log('================================================================'.data);
console.log("");

///////////////////////////////////////////////////////////////
//VARIABLES
///////////////////////////////////////////////////////////////
var formidable = require('formidable');
var path = require('path');
//Pseudo des message du serveur
var admin_name = "server";

//Tableau contenant les sockets de tous les clients
var clients = [];

// rooms which are currently available in chat
var rooms = ['public'];

///////////////////////////////////////////////////////////////
// CONFIGURATION DU SERVEUR
///////////////////////////////////////////////////////////////

//Crée le serveur
var express = require('express'),
    app=express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');

//Détermine le dossier des ressources du serveur
app.use(express.static(__dirname + '/static'));

// Chargement de la page index.html
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/static/index.html');
});

//https://coligo-uploader.herokuapp.com/
app.post('/upload', function(req, res){

  // create an incoming form object
  var form = new formidable.IncomingForm();

  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/static/img');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
  });

  // parse the incoming request containing the form data
  form.parse(req);

});


//https://coligo-uploader.herokuapp.com/
app.post('/uploadChat', function(req, res){

  // create an incoming form object
  var form = new formidable.IncomingForm();

  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/static/users_files');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

  form.on('room', function(room){
    console.log(room);
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
  });

  // parse the incoming request containing the form data
  form.parse(req);

});
///////////////////////////////////////////////////////////////
// DEFINITION DES EVENEMENTS IO
///////////////////////////////////////////////////////////////

io.sockets.on('connection', function (socket, username) {
    
    // Dès qu'on nous donne un username, on le stocke en variable de session et on informe les autres personnes
    socket.on('login', function(_username, _password) {
        getLogin(_username, _password, socket);
    });

    // Dès qu'on reçoit un message, on récupère le username de son auteur et on le transmet aux autres personnes
    socket.on('message', function (_message, _room) { 
        console.log(_room+', message :'+_message);     
        insertMess(socket.username, _message, _room, getDate());
        _message = ent.encode(_message);
        io.sockets.in(_room).emit('message', {username:socket.username, picture:socket.picture,room:_room, message:{message:_message, date:getDate()}});
        //socket.broadcast.emit('message', {username:socket.username, picture:socket.picture,room:_room, message:{message:_message, date:getDate()}});
    }); 

    // Dès qu'on reçoit un message, on récupère le username de son auteur et on le transmet aux autres personnes
    socket.on('privateMessage', function (_message, _to) { 
        console.log('private message to :'+_to +" from "+socket.username+", message :"+_message);     
        var status = 'readed';
        _message = ent.encode(_message);
        var client = getClientSocket(_to);
        if(!client)
          status = 'unreaded';
        else
          client.emit('privateMessage', {username:socket.username, picture:socket.picture,room:socket.username, message:{message:_message, date:getDate()}});
          socket.emit('privateMessage', {username:socket.username, picture:socket.picture,room:_to, message:{message:_message, date:getDate()}});

        insertPrivateMess(socket.username, _message, _to, getDate(), status);
        
        //socket.broadcast.emit('message', {username:socket.username, picture:socket.picture,room:_room, message:{message:_message, date:getDate()}});
    }); 

    // GeoLocalisation
    socket.on('emitPosition', function (position) {
        console.log('position recue '+position.lat);
        socket.broadcast.emit('update_map', {username: socket.username, position: position});
    }); 

    socket.on('disconnect', function(client) {
        console.log('<-- '+socket.username+" is disconnected".error);
        delete clients[socket.username];
        console.log("Utilisateurs connectés : "+getAllClients());
        socket.broadcast.emit('userList',{userList:getAllClients()});
    });

    socket.on('register', function(_username, _password, _picture) {
        registerUser(_username, _password, _picture, socket);
    });

    socket.on('joinRoom', function(_room) {
        socket.join(_room);
        io.sockets.in(_room).emit('message', {username:admin_name, picture:null,room:_room, message:{message:socket.username+" a rejoint le chat", date:getDate()}});
    });

    socket.on('quitRoom', function(_room) {
        socket.leave(_room);
        io.sockets.in(_room).emit('message', {username:admin_name, picture:null,room:_room, message:{message:socket.username+" a quitté le chat", date:getDate()}});
    });
});

server.listen(3000, "0.0.0.0");

///////////////////////////////////////////////////////////////
// FONCTIONS SERVEUR
///////////////////////////////////////////////////////////////

function getDate()
{
  return new Date().getTime();
}

function getClientIndex(_username)
{
  var t =0;
  for(var i in clients)
  {
    if(clients[i].username == _username){
      return t;
    };
    t++;
  }
}

function getClientSocket(_username)
{
  console.log(clients[_username]);
  return clients[_username]==undefined?false:clients[_username];
}

function getAllClients()
{
  var t = [];
  for(var i in clients)
  {
    t.push({username:clients[i].username, picture:clients[i].picture});
  }

  return t;
}

///////////////////////////////////////////////////////////////
// CONNECTION MYSQL
///////////////////////////////////////////////////////////////

var mysql = require('mysql');

var connection = mysql.createConnection({
  host: '127.0.0.1',
  port: '8889',
  user: 'root',
  password: 'root',
  database: 'chat'
});

///////////////////////////////////////////////////////////////
// FONCTIONS BASE DE DONNES
///////////////////////////////////////////////////////////////

function insertMess(_user, _data, _room, _d)
{
  var post  = {
    room:_room,
    date: _d,
    fromuser:_user,
    message: _data
  };

  connection.query('INSERT INTO messages SET ?', post, function (err, result) {
    if(err != null)
    {
        console.log(err);
    }
  });
}

function insertPrivateMess(_user, _data, _to, _d,_status)
{
  var post  = {
    status:_status,
    touser:_to,
    date: _d,
    fromuser:_user,
    message: _data
  };

  connection.query('INSERT INTO private_messages SET ?', post, function (err, result) {
    if(err != null)
    {
        console.log(err);
    }
  });
}

function getLogin(_username, _password, _socket)
{
  connection.query('SELECT * FROM users WHERE login="'+_username+'" AND password="'+_password+'"', function (err, result) 
  {
    if(err != null)
    {
        _socket.emit('loginError');
        console.log(err);
    }
    else
    {
      if(result.length == 0)
      {
        _socket.emit('loginError');
      }
      else
      {
        clients[_username] = _socket;
        console.log('--> '+_username+" is connected".info);
        
        // store the username in the socket session for this client
        _socket.username = _username;
        _socket.picture = result[0].picture;
        _socket.emit('loginAccepted', {userList:getAllClients()});
        _socket.broadcast.emit('newUser', {username:_username, userList:getAllClients()});
        // store the room name in the socket session for this client
        // echo to client they've connected
        
        //_socket.emit('userlist', getRoomUsers(rooms[0]));
        // echo to room 1 that a person has connected to their room
        //_socket.broadcast.to(rooms[0]).emit('message', _username + ' has connected to this room');
        console.log("Utilisateurs connectés : "+getAllClients());
        var session = new Session(_username);
        session.start();
        
        
      };
    }
  });
}

function checkIfUserExists(_username)
{
  connection.query('SELECT * FROM users WHERE login="'+_username+'"', function (err, result) 
  {
    if(err != null)
    {
        _socket.emit('loginError');
        console.log(err);
    }
    else
    {
      console.log(result.length);
      if(result.length == 0)
      {
        return false;
      }
      else
      {
        return true;
        
      };
    }
  });
}

function registerUser(_username, _password, _picture, _socket)
{

  if(checkIfUserExists(_username))
  {
    _socket.emit('registerError');
    return;
  }

  console.log("Nouvel utilisateur enregistré : "+_username+"  "+_password+"  "+_picture);
  var post  = {
    login:_username,
    password: _password,
    picture:_picture
  };

  connection.query('INSERT INTO users SET ?', post, function (err, result) 
  {
    if(err != null)
    {
      _socket.emit('registerError');
    }
    else
    {
      _socket.emit('registerAccepted');
    }
  });
}
var current_date;
setInterval(setCurrentDate,5000);
function setCurrentDate(){
  current_date = new Date().getTime();
}
function Session(_time, _socket1, _socket2) {

  var _this = this;

  this.start_time = new Date().getTime();
  this.max_time = _time;
  this.s1 = _socket1;
  this.s2 = _socket2;
  this.interval;
  
  this.stop = function(){
    s1.emit("sessionStart",{id:this.start_time});
    s2.emit("sessionStart",{id:this.start_time});
  }
  this.start = function(){
    console.log('hohoho'+this.name);
    this.interval = setInterval(this.checkTime, 5000);
    //setTimeout(this.stop,1000);
  }
  this.checkTime = function()
  {
    var t = Math.round((current_date-_this.start_time)/1000);
    if(t > this.max-time)
    {
      clearInterval(this.interval);
      s1.emit("sessionStop",{id:this.start_time});
      s2.emit("sessionStop",{id:this.start_time});
    }
  }
}







