	import os
	from flask import Flask, render_template
	# create the app
	app = Flask(__name__)
	app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
	@app.route('/')
	def index():
	    return render_template('index.html')
