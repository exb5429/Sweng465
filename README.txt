Project by Noah Pfeffer and Ethan Bartley


Step 1: Check to make sure all the node modules are updated in our download or use npm install in the console
We used webstorm, but we think most IDEs will work. If it does not initially run, you could try clone from the git repository (https://github.com/exb5429/Sweng465) and doing npm install.
We are using a .count() function associated with Mongoose that is deprecated, so later versions may not support it.

Step 2: Run App.js and go to localhost:3000

You can then perform all the standard actions a user can by signing up and going to the different tabs
If you want to test the http methods you can sign in as an admin with Username: admin and Password: admin

This will give access to the admin dropdown which has the corresponding Get, Post, and Delete for services. Some functions like question do not have a post,
because it is fully integrated into the user UI. Some of them will require and ID if specified, our ID system starts at 1 and increments and should fill any spots it finds.
For example, you can find an answer object by doing the admin Get for a user, then doing an admin get for their questions, and
using an ID from one of those questions to do an admin Get for an answer.

Deleting larger objects like a User will delete any corresponding info that user has connected to it.
The current admin account is currently hard coded into the database, but the delete user function is made to not delete
any admin accounts.

The Get requests will print out the objects from the database to the console of your IDE and to the HTML page.

The Posts will just add the entry to the database and print in the console what you added.
