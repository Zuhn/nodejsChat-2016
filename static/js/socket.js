var username;
var password;
// Connexion à socket.io
var socket = io.connect('http://localhost:3000');

socket.on('loginError', function() {
    loginError();
})

socket.on('loginAccepted', function(_data) {
    loginAccepted(_data);  
})

socket.on('registerError', function() {
    registerError();
})

socket.on('registerAccepted', function(_data) {
    registerAccepted(_data);  
})

socket.on('message', function(_data) {
    console.log("message"+_data.message.message);
    displayMessage(_data.username, _data.message, _data.picture, _data.room);
})

socket.on('privateMessage', function(_data) {
 
  if($('#'+_data.room).length==0)
  {
    buildPrivateChat(_data.room, 'red');
  }
  displayMessage(_data.username, _data.message, _data.picture, _data.room);
})

socket.on('updateMap', function(_data) {
    showPosition(_data);
})
// Quand un nouveau client se connecte, on affiche l'information
socket.on('userList', function(_data) {
    displayUserList(_data.userList);
})
// Quand un nouveau client se connecte, on affiche l'information
socket.on('newUser', function(_data) {
    $('#zone_chat').append('<p><em>' + _data.username + ' a rejoint le Chat !</em></p>');
    displayUserList(_data.userList);
})
socket.on('error', function(err){
    console.log('error server');
  });
socket.on('disconnect', function(err){
    socket.disconnect();
    console.log('disconnect server');
  });
socket.on('reconnect_attempt', function(err){
    console.log('reconnect_attempt server');
  });
socket.on('reconnect_error', function(err){
    console.log('reconnect_error server');
  });
socket.on('reconnect_failed', function(err){
    console.log('reconnect_failed server');
  });

///////////////////////////////////////////////////////////////
// FONCTIONS BASE DE DONNES
///////////////////////////////////////////////////////////////

function login()
{
    socket.emit('login', $('#username').val(),$('#password').val());
}

function register()
{
    console.log($('#upload-input').get(0).files);
    uploadFile($('#upload-input').get(0).files);
}

function sendRegister()
{
     socket.emit('register', $('#reg_username').val(),$('#reg_password').val(),$('#upload-input').get(0).files[0].name);
}

function loginAccepted(_data)
{

    console.log('login accepted');
    loadPage(2);
    //setInterval(getLocation, 10000);
    username = $('#username').val();
    password = $('#password').val()
    localStorage.setItem("login", username);
    localStorage.setItem("password", password);
    displayUserList(_data.userList);

    $('#titre_user').text("Vos conversations : "+username);

    var autoNum = 0;

    buildChat('public', 'red');
    //buildChat('test','blue');

            
}

function loginError()
{
    console.log('login error');
}

function registerAccepted(_data)
{
    socket.emit('login', $('#reg_username').val(),$('#reg_password').val());
}

function registerError()
{
    console.log('login error');
}

function joinRoom(_name)
{
  socket.emit('joinRoom', _name);
}

function quitRoom(_name)
{
  socket.emit('quitRoom', _name); 
}


function displayMessage(_username, message, _picture, _room) {
    var mess = replaceURLWithHTMLLinks(message.message)
    switch(_username)
    {
        case username:     
            $('#'+_room).append('<div style="float:right;max-width:300px"><pre style="background-color:rgba(147,206,222,1);color:white;margin:0px; padding:5px;border-radius:5px;">' + mess +'</pre></div><div style="clear:both"></div>')
                           .append('<div style="float:right;"><pre style="color:rgba(147,206,222,1);margin:0px; padding:5px;border-radius:5px;font-size:10px">' + moment(message.date).format('LL') +'</pre></div><div style="clear:both"></div>');        
        break;
        case 'server' :
            $('#'+_room).append('<div style="margin-left:5px;max-width:200px"><pre style="display:inline; margin-left:0px">' + moment(message.date).format('LL')  +'</pre> </div>')
                           .append('<div style="margin:0px 0px 20px 5px; color:green; max-width:300px"><pre style="display:inline; margin-left:0px; ">' + mess +'</pre> </div>');
        break;
        default :    
            $('#'+_room).append('<div style="margin-left:5px; max-width:300px"><div style="display:inline;"><img style="display:block;width:30px" src="img/'+_picture+'" ></img><span style="border-radius:5px">' + _username + ' </span></div><pre style="display:inline; margin-left:10px">' + mess+'</pre> </div>')
                           .append('<div style="margin-left:5px; color:rgba(147,206,222,1)"><pre style="display:inline; margin-left:0px; font-size:10px">' + moment(message.date).format('LL')  +'</pre> </div>'); 
    }

    var height = document.getElementById(_room).scrollHeight;
    $('#'+_room).animate({scrollTop:height});
}

function displayUserList(_list)
{
  $('#user_list>div>div').remove();
  for(var i=0; i<_list.length; i++)
  {
    $('#user_list').append('<div style="margin:5px; max-width:300px; position:relative"><div class="user_bt" style="position:absolute; top:0px;left:0px;width:100%;height:30px;">+</div><div style="display:inline;"><img style="width:30px;margin-bottom:-5px" src="img/'+_list[i].picture+'" ></img><span style="border-radius:5px;margin-left:5px;">' + _list[i].username + '</span></div></div>')
    $('#user_list').find('.user_bt:last').click(function(){
      buildPrivateChat($(this).parent().find('div>span').text(), 'red');
    });
  }
}

function uploadFile(_files)
{
    var files = _files;

    if (files.length > 0){
    // create a FormData object which will be sent as the data payload in the
    // AJAX request
    var formData = new FormData();

    // loop through all the selected files and add them to the formData object
    for (var i = 0; i < files.length; i++) {
      var file = files[i];

      // add the files to formData object for the data payload
      formData.append('uploads[]', file, file.name);
    }

    $.ajax({
      url: '/upload',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(data){
          sendRegister();
      },
      xhr: function() {
        // create an XMLHttpRequest
        var xhr = new XMLHttpRequest();

        // listen to the 'progress' event
        xhr.upload.addEventListener('progress', function(evt) {

          if (evt.lengthComputable) {
            // calculate the percentage of upload completed
            var percentComplete = evt.loaded / evt.total;
            percentComplete = parseInt(percentComplete * 100);

            // update the Bootstrap progress bar with the new percentage
            $('.progress-bar').text(percentComplete + '%');
            $('.progress-bar').width(percentComplete + '%');

            // once the upload reaches 100%, set the progress bar text to done
            if (percentComplete === 100) {
              $('.progress-bar').html('Done');
            }

          }

        }, false);

        return xhr;
      }
    });

    }
}

function uploadFileChat(_files,_room)
{
    var files = _files;

    if (files.length > 0){
    // create a FormData object which will be sent as the data payload in the
    // AJAX request
    var formData = new FormData();
    formData.append('room', 'public');
    // loop through all the selected files and add them to the formData object
    for (var i = 0; i < files.length; i++) {
      var file = files[i];

      // add the files to formData object for the data payload
      formData.append('uploads[]', file, file.name);
    }

    $.ajax({
      url: '/uploadChat',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(data){
          sendRegister();
      },
      xhr: function() {
        // create an XMLHttpRequest
        var xhr = new XMLHttpRequest();

        // listen to the 'progress' event
        xhr.upload.addEventListener('progress', function(evt) {

          if (evt.lengthComputable) {
            // calculate the percentage of upload completed
            var percentComplete = evt.loaded / evt.total;
            percentComplete = parseInt(percentComplete * 100);

            // update the Bootstrap progress bar with the new percentage
            $('.progress-bar').text(percentComplete + '%');
            $('.progress-bar').width(percentComplete + '%');

            // once the upload reaches 100%, set the progress bar text to done
            if (percentComplete === 100) {
              $('.progress-bar').html('Done');
            }

          }

        }, false);

        return xhr;
      }
    });

    }
}

function replaceURLWithHTMLLinks(text) {
    var exp = /(\b(https?|ftp|file):\/\/([-A-Z0-9+&@#%?=~_|!:,.;]*)([-A-Z0-9+&@#%?\/=~_|!:,.;]*)[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp, "<a href='$1' target='_blank'>$1</a>");
}