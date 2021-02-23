//Node Modules
const hive = require('@hiveio/hive-js'); //MIT License https://opensource.org/licenses/MIT
const dhive = require('@hiveio/dhive'); //BSD-3-Clause https://opensource.org/licenses/BSD-3-Clause
const schedule = require('node-schedule'); //MIT License https://opensource.org/licenses/MIT
const fs = require('fs'); //ISC license https://opensource.org/licenses/ISC
const logOveride = require('./logger.js');

//Initialise console.log(); to log to file
logOveride();

//Hive Node.
let hiveAPI = "https://rpc.ausbit.dev";
//Init Dhive
const client = new dhive.Client(hiveAPI);
//Init Hive-JS
hive.api.setOptions({
    url: hiveAPI
});
console.log(`HIVE API: ${hiveAPI}`)

//Establish Program Settings
const ACCOUNT = {
    NAME: `your_username`,
    POST_KEY: `your_private_posting_key`,
    ACTIVE_KEY: `your_private_active_key`
}
let SETTINGS = {};

// read approved.json file into memory
fs.readFile(`./data/approved.json`, 'utf8', (err, file) => {
    if (!file) console.log(`Error: config.json not loaded: ${err}`);
    else {
        SETTINGS.config = JSON.parse(file);
        schedular();
    }
});

//Schedule for 10am and 10pm local time.
function schedular(params) {
    let morning_vote = schedule.scheduleJob({
        hour: 10,
        minute: 00
    }, () => {
        console.log(`Morning Vote`, true);
        start_iteration();
        setTimeout(() => {
            console.log(`Morning Claim`, true);
            claim_rewards();
        }, 1800000);
    });
    let evening_vote = schedule.scheduleJob({
        hour: 22,
        minute: 00
    }, () => {
        console.log(`Evening Vote`, true);
        start_iteration();
        setTimeout(() => {
            console.log(`Evening Claim`, true);
            claim_rewards();
        }, 1800000);
    });
    //Uncomment for testing without waiting for scheduled time.
    //start_iteration();
    //claim_rewards();
}

//start looping through approved accounts
function start_iteration() {
    SETTINGS = {
        app: `frog_cake_comment_upvoter`,
        version: 0.2,
        config: SETTINGS.config,
        accounts: {
            names: [],
            vote_strength: {}
        },
        valid_comments: {},
        valid_comments_array: [],
        voting: {
            strength: 10000, //Default voting strength.
            quantity: 6 //Number of votes each round.
        }
    }
    console.log(`Loop starting.`);
    let arrayOfNames = Object.getOwnPropertyNames(SETTINGS.config);
    arrayOfNames.forEach(name => {
        let vote_strength = SETTINGS.config[name].votestrength;
        console.log(`${name} - ${vote_strength}`);
        SETTINGS.accounts.names.push(name);
        SETTINGS.accounts.vote_strength[name] = vote_strength;
    });
    get_participants_comments(0, 0);
}


//get the accounts last #`xx` comments 
function get_participants_comments(x, y) {
    let name = SETTINGS.accounts.names[x];
    console.log(`Getting ${name}'s comments`, true);

    let query = `/@${name}/comments`;
    let commentList = [];
    client.database.call('get_state', [query]).then(result => {
        Object.values(result.content).forEach(comment => {
            commentList.push(comment);
        });
        filter_comments(x, commentList, name);
    }, function (error) {
        console.log(error, true)
        if (y < 10) {
            y++;
            setTimeout(() => {
                console.log(`Retrying for ${name}'s comments... The following should be 0: ${commentList.length}`);
                if (commentList.length > 0) console.log(`Error has occured. Suspected double voting cause. !!!!!!!!!`);
                get_participants_comments(x, y);
            }, 1000);
        }
    });
}

//check if comment is less than six days old, and hasn't already been voted on
function filter_comments(x, comments, name) {
    let authors_valid_comments = [];
    comments.forEach((comment) => {
        let valid = true;
        let timeNow = Date.now();
        let date = comment.last_update;
        let ms = Date.parse(date);

        if (ms > (timeNow - 518400000)) {
            //Post is less thn 6 days old; valid.
        } else {
            //Post is too old
            valid = false
        }

        if (comment.parent_author === "") {
            //Root level post !valid
            valid = false;
        }

        if (valid) {
            comment.active_votes.forEach(vote => {
                if (vote.voter === ACCOUNT.NAME) {
                    valid = false;
                    //Comment already up-voted.
                }
            });
        }
        if (valid) {
            authors_valid_comments.push(comment.permlink);
            //Add to list of valid comments
        }
    });

    //Add to eligble list
    if (authors_valid_comments.length > 0) {
        SETTINGS.valid_comments[name] = authors_valid_comments;
        SETTINGS.valid_comments_array.push(name);
    }

    //Next account || proceed.
    if (x < SETTINGS.accounts.names.length - 1) {
        x++;
        console.log(`Status: ${x}/${SETTINGS.accounts.names.length} collected`);
        get_participants_comments(x, 0)
    } else {
        //Select specifies number of winners
        console.log(`All accounts checked.`);
        Object.values(SETTINGS.valid_comments).forEach((array, i) => {
            console.log(`${SETTINGS.valid_comments_array[i]}'s valid comments - ${array}\n`);
        });
        
        let draw_winners = [];
        let x = 0;
        //Select required number of most recent comment. If not enough accounts with valid comments, redraw
        while (draw_winners.length < SETTINGS.voting.quantity && x < 10) {
            x++;
            console.log(`Draw Winners qty:${draw_winners.length} | x: ${x}`);
            let name_pool = JSON.parse(JSON.stringify(SETTINGS.valid_comments_array));
            let name_pool_length = `${SETTINGS.valid_comments_array.length}`;
            name_pool_length = parseInt(name_pool_length);
            for (let i = 0; i < name_pool_length; i++) {
                if (draw_winners.length < SETTINGS.voting.quantity) {
                    let number = Math.floor((Math.random() * name_pool.length) + 1) - 1;
                    let winning_comment = (SETTINGS.valid_comments[name_pool[number]]).splice(0, 1);
                    let winner = name_pool.splice(number, 1);
                    draw_winners.push(`${winning_comment}|${winner}`);
                }
            }
        }
        if (draw_winners.length > 1) cast_votes(draw_winners)
    }
}

//Cast votes at interval.
function cast_votes(draw_winners) {
    draw_winners.forEach((winning_comment, x) => {
        console.log(winning_comment);
        let parameters = winning_comment.split("|");
        setTimeout(() => {
            hive.broadcast.vote(ACCOUNT.POST_KEY, ACCOUNT.NAME, parameters[1], parameters[0], (!isNaN(SETTINGS.accounts.vote_strength[parameters[1]])) ? SETTINGS.accounts.vote_strength[parameters[1]] : SETTINGS.voting.strength, function (err, result) {
                console.log(`Vote for winner ${x+1}/${draw_winners.length}. Error: ${err},  Result: ${result}`, true);
                if (err) {
                    console.log(`Retrying vote for winner ${x+1}/${draw_winners.length}. Error: ${err},  Result: ${result}`, true);
                    setTimeout(() => {
                        hive.broadcast.vote(ACCOUNT.POST_KEY, ACCOUNT.NAME, parameters[1], parameters[0], (!isNaN(SETTINGS.accounts.vote_strength[parameters[1]])) ? SETTINGS.accounts.vote_strength[parameters[1]] : SETTINGS.voting.strength, function (err, result) {
                            console.log(`Retry for winner ${x+1}/${draw_winners.length}. Error: ${err},  Result: ${result}`);
                        });
                    }, SETTINGS.voting.quantity * 10000);
                }
            });
        }, 10000 * (x + 1));
    });
}

//Claim curation rewards.
function claim_rewards() {
    console.log(`Starting claim_rewards()`, true);
    hive.api.getAccounts([ACCOUNT.NAME], function (err, result) {
        console.log(`Get Account Details for Pending Vests... Error: ${err}, Result: ${result}`)
        if (result) {
            let hbd_reward = result[0].reward_hbd_balance
            let hive_reward = result[0].reward_hive_balance
            let hive_power_in_vests = result[0].reward_vesting_balance
            if (hbd_reward > 0 || hive_reward > 0 || hive_power_in_vests > 0) {
                hive.broadcast.claimRewardBalance(ACCOUNT.ACTIVE_KEY, ACCOUNT.NAME, hive_reward, hbd_reward, hive_power_in_vests, function (err, result) {
                    console.log(`Claiming Rewards Balance... Error: ${err}, Result: ${result}`)
                });
            } else console.log(`No Rewards To Claim.`);
        }
    })
}