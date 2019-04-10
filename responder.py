import json
import bcrypt
import datetime

from pymongo import MongoClient
from bson.json_util import dumps


clients = []

class Responder:
    request = None
    client = None
    server = None

    db = None

    def __init__(self, client, server, message):
        try:
            self.request = json.loads(message)
        except json.JSONDecodeError:
            self.send({"error": "njf"})

        self.client = client
        self.server = server

        self.db = MongoClient().pad

        if self.request['request'] == 'auth_user':
            if self.auth_user():
                self.send({'success': True})
        elif self.request['request'] == 'post':
            self.post()
        elif self.request['request'] == 'subscribe_to_posts':
            self.subscribe_to_posts()
        elif self.request['request'] == 'get_posts':
            self.get_posts()

    def auth_user(self):
        if not self.request.get("user"):
            self.send({'error': "Please type in a username."})
            return False

        self.request['user'] = self.request['user'].strip()

        if self.request['user'] == '':
            self.send({'error': "Please type in a username."})
            return False
        
        if not self.request.get("password"):
            self.send({'error': "Please type in a password."})
            return False

        if len(self.request['user']) > 10:
            self.send({'error': "Username is above 10 characters."})
            return

        if len(self.request['password']) > 20:
            self.send({'error': "Password is above 20 characters."})
            return
        
        user = self.db.users.find_one({'user': self.request['user']})
        if not user:
            user = self.db.users.insert_one({'user': self.request['user'], 'password': bcrypt.hashpw(self.request['password'].encode('utf-8'), bcrypt.gensalt())})
            return True

        if (bcrypt.checkpw(self.request['password'].encode('utf-8'), user['password'])):
            return True
        else:
            self.send({'error': "Your password is incorrect."})
            return False

    def post(self):
        if not self.auth_user():
            return
        
        if not self.request.get('subject'):
            self.send({'error': "Please enter a subject"})
            return
        if not self.request.get('message'):
            self.send({'error': "Please enter a post"})
            return

        self.request['message'] = self.request['message'].strip()

        if self.request['message'] == '':
            self.send({'error': "Please enter a post."})
            return False
        
        if len(self.request['message']) > 140:
            self.send({'error': 'Post is above 140 characters.'})
        
        if len(self.request['subject']) > 10:
            self.send({'error': 'Subject is above 140 characters.'})

        post1 = {'subject': self.request['subject'], 'user': self.request['user'], 'message': self.request['message'], 
                'timestamp': datetime.datetime.now().timestamp()}
        self.db.posts.insert_one(post1)

        for client, request_id in clients:
            post1['response_id'] = request_id
            string_message = dumps(post1)
            self.server.send_message(client, string_message)


    def subscribe_to_posts(self):
        clients.append((self.client, self.request['request_id']))
    
    def get_posts(self):
        if self.request.get('subject'):
            self.send({'posts': self.db.posts.find({'subject': self.request['subject']})})
        else:
            self.send({'posts': self.db.posts.find({})})

    def send(self, message):
        message['response_id'] = self.request['request_id']
        string_message = dumps(message)
        self.server.send_message(self.client, string_message)

