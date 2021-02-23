# frogcake
Frogcake comment upvoter. Used by the #southaustralia community on the HIVE Blockchain to upvote members comments.

## NodeJS
Ensure a recent version of NodeJS is installed.

## Node modules to install (Required)
Please install the following:

https://www.npmjs.com/package/@hiveio/hive-js //MIT License https://opensource.org/licenses/MIT
https://www.npmjs.com/package/@hiveio/dhive //BSD-3-Clause https://opensource.org/licenses/BSD-3-Clause
https://www.npmjs.com/package/node-schedule //MIT License https://opensource.org/licenses/MIT

## Configuring

For each user you wish to add to the name pool, ensure they are included in \data\approved.json as follows, ensuring to enter HIVE usernames without @ and either "default" or a number between 1 (0.01%) and 10000 (100.00%) for votestrength.

> {
    "kiokizz": {
        "votestrength": "default"
    },
    "mattclarke": {
        "votestrength": 10000
    },
    "aggroed": {
        "votestrength": 9000
    }
}

Vote strength is by default 100%, and 6 votes will be sent out twice daily as 10am/pm server time. This maximses voting power of the account. Advanced users may wish to change this withing frogcake.js: `SETTINGS.voting {strength: 10000, quantity: 6}`

## Running

> node .\frogcake.js
