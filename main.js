var CONNURL = "wss://home.omarelamri.me:9001"

var posts_all = []

function go() {
    var user = document.getElementById('user').value;
    var password = document.getElementById('password').value;

    sc.add({request: 'auth_user', user: user, password: password}, function(data) {
        if (!data.error) {
            var head = document.getElementById("header");
            head.style.opacity = 0;

            var lapad = document.getElementById("lapad")
            lapad.style.opacity = 1;

            getPosts();
        }
    })
}

function getPosts() {
    sc.add({'request': 'get_posts'}, function (data) {
        if (!data.error) {
            console.log(data.posts)
            for (var i = 0; i < data.posts.length; i++) {
                addPost(data.posts[i].user, data.posts[i].subject, data.posts[i].message)
            }
        }
    })

    sc.add({'request': 'subscribe_to_posts'}, function (data) {
        if (!data.error) {
            addPost(data.user, data.subject, data.message, true)
        }
    })
}

function post() {
    var user = document.getElementById('user').value;
    var password = document.getElementById('password').value;
    var message = document.getElementById('post').value;
    var subject = document.getElementById('subject').value;

    sc.add({request: 'post', user: user, password: password, message: message, subject: subject});
}

function addPost(user, subject, text, new_post=false, dont_push=false) {
    if (!dont_push) {
        posts_all.push({user: user, subject: subject, text: text})
    }
    var filter = document.getElementById("filter").value;
    if ((filter != "general" || filter != "") && filter != subject) {
        console.log("skip")
        return
    }

    var posts = document.getElementById("posts");
    var post = document.createElement("li");
    var title = document.createElement("b");
    title.appendChild(document.createTextNode("@" + user + ": " + subject + ": "));
    
    if (new_post) {
        post.style.opacity = 0;
        post.style.transition = "all 0.2s";
    }
    post.appendChild(title);
    post.appendChild(document.createTextNode(text));
    

    posts.insertBefore(post, posts.firstChild)

    if (new_post) {
        post.style.opacity = 1;
    }
}

function applyFilter() {
    console.log(posts_all)
    document.getElementById("posts").innerHTML = "";
    for (var i = 0; i < posts_all.length; i++) {
        addPost(posts_all[i].user, posts_all[i].subject, posts_all[i].text, false, true)
    }
}

var ServerconnService = /** @class */ (function () {
    function ServerconnService() {
        this._callbacks = [];
        this._caches = [];
        this.openCallbacks = [function () { }];
        this._initialize();
    }
    ServerconnService.prototype._check = function () {
        if (!this._ws || this._ws.readyState == 3) {
            this._initialize();
        }
    };
    ServerconnService.prototype._initialize = function () {
        var _this = this;
        this._ws = new WebSocket(CONNURL);
        this._ws.onmessage = function (e) {
            var data = JSON.parse(e.data);
            _this._callbacks.forEach(function (callback) {
                if (data.response_id === callback[0]) {
                    if (data.error) {
                        alert(data.error);
                    }
                    callback[1](data);
                }
            });
        };
        this._ws.onerror = function (e) {
            _this._check();
        };
        this._ws.onclose = function (e) {
            _this._check();
        };
        this._ws.onopen = function (e) {
            for (var _i = 0, _a = _this.openCallbacks; _i < _a.length; _i++) {
                var callback = _a[_i];
                callback();
            }
            _this._caches.forEach(function (element) {
                _this._ws.send(element);
            });
        };
    };
    ServerconnService.prototype.add = function (data, callback) {
        var identifier = this._generateIdentifier();
        data.request_id = identifier;
        this._callbacks.push([identifier, callback]);
        if (this._ws.readyState == this._ws.OPEN) {
            this._ws.send(JSON.stringify(data));
        }
        else {
            this._caches.push(JSON.stringify(data));
        }
    };
    ServerconnService.prototype._generateIdentifier = function () {
        return uuidv4();
    };
    return ServerconnService;
}());
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

var sc = new ServerconnService();