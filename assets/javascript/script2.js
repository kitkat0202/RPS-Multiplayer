$(function() {
    var config = {
        apiKey: "AIzaSyCXwehCtZIjtx0TnjSqiNUtJhXXphY3rYA",
        authDomain: "rps-game-73c1b.firebaseapp.com",
        databaseURL: "https://rps-game-73c1b.firebaseio.com",
        projectId: "rps-game-73c1b",
        storageBucket: "",
        messagingSenderId: "515935273363"
    }
    firebase.initializeApp(config)
    var database = firebase.database()

    var connectionsRef = database.ref("/connections")
    var connectedRef = database.ref(".info/connected")
    var waitRef = database.ref("/wait")
    var gameRef = database.ref("/game")

    var player = {} // id, name, move
    var opponent = {}
    var gameRoom = 0
    var thisGameRoom = 0
    var chooseOn = false
    var msgOn = false

    // restart
    let restart = () => {
        // clear database move
        gameRef.child(thisGameRoom).child(opponent.id).child("move").remove()
        
        setTimeout(() => {
            // reset moves
            player.move = ""
            opponent.move = ""
            // remove color filter from choices
            var arrayFilterCheck = ["rock", "paper", "scissors"]
            arrayFilterCheck.forEach(function(element) {
                if ($(`#${element}`).hasClass("grayscale")) {
                    $(`#${element}`).removeClass("grayscale")
                }
            })

            $(".player-right h2").removeClass("win-lose").text(`Opponent: ${opponent.name}`)
            $("#right-img-choice").empty()
            $("#left-img-choice").empty()
        }, 2000);
        setTimeout(() => {
            chooseOn = true
        }, 2005);
    }

    // function at tie
    let tie = () => {
        $(".player-right h2").text(`No Winners Here...`).addClass("win-lose")
    }

    // function at win
    let win = () => {
        player.win = player.win + 1
        $(".left-win-score").text(player.win)
        $(".player-right h2").text(`You WON!`).addClass("win-lose")
    }

    // function at lose
    let lose = () => {
        player.lose = player.lose + 1
        $(".left-lose-score").text(player.lose)
        $(".player-right h2").text(`You lose...`).addClass("win-lose")
    }

    // Check win lose
    let checkWin = (choice1, choice2) => {
        if (choice1 === choice2) {
            tie() 
        } else if ((choice1 === "rock" && choice2 === "scissors") || (choice1 === "scissors" && choice2 === "paper") || (choice1 === "paper" && choice2 === "rock")) {
            win()
        } else if ((choice1 === "scissors" && choice2 === "rock") || (choice1 === "paper" && choice2 === "scissors") || (choice1 === "rock" && choice2 === "paper")) {
            lose()
        }
        restart()
    }

    // Creating players
    $("#submit-name").on("click", function(event) {
        event.preventDefault();
        if(!$("#name-input").val()) {
            return
        } else {
            var thisName = $("#name-input").val().trim()
            player.name = thisName.replace(/(\b[a-z](?!\s))/g, function(x){return x.toUpperCase()})
            $(".name-request").addClass("disappear")
            $(".game-section").removeClass("disappear")
            $(".player-score").removeClass("disappear")
            $(".player-left h2").text(`Player: ${player.name}`)

            waitRef.child(player.id).set({
                player: player.name
            })
        }
    })

    // saving player choice
    $("#left-img .img-pic").on("click", function() {
        if (chooseOn) {
            player.move = $(this).attr("data-choice")
            $("#left-img .img-pic").addClass("grayscale")
            $(this).removeClass("grayscale")
            $("#left-img-choice").html($(`<img class="img-fluid" src="assets/images/${player.move}.png">`))
            
            gameRef.child(thisGameRoom).child(player.id).child("move").set(player.move)
            
            chooseOn = false

            if (!opponent.move) {
                $(".player-right h2").text("Waiting for opponent...")
            }
        }
    })


    // submit message
    $("#submit-msg").on("click", function() {
        event.preventDefault();
        if (msgOn) {
            if(!$("#message-input").val()) {
                return
            } else {
                player.message = $("#message-input").val().trim()
                $(".msg").append($("<div>").addClass("mymsg").html(`<p><span class="msg-name">${player.name}:</span> <span class="msg-msg">${player.message}</span></p>`))
                $(".msg").scrollTop($(".msg").prop('scrollHeight'))
                gameRef.child(thisGameRoom).child(player.id).child("message").set(player.message)
            }
        }
        $("#message-input").val("")
    })


    // connection count and player ID
    connectedRef.on("value", function(snap) {
        if (snap.val()) {
          var con = connectionsRef.push(true)
          player.id = con.key
          con.onDisconnect().remove()
        }
    });


    // add viewcounter HTML
    connectionsRef.once("value", function(snap) {
        // keeps track of game rooms
        if (snap.numChildren()%2 === 0) {
            gameRoom = snap.numChildren()/2
        } else if (snap.numChildren() === 1) {
            gameRoom = 1
        } else {
            gameRoom = (snap.numChildren() + 1)/2
        }
    })

    // when player leaves from game room
    gameRef.child(thisGameRoom).on("child_removed", function(snap) {
        waitRef.child(player.id).set({
            player: player.name
        })
        msgOn = false
        chooseOn = false
        $(".msg").empty()
        $(".msg").append($("<div>").addClass("logoff").html(`<p>${opponent.name} has logged off</p>`))
        $("#left-img").addClass("disappear")
        $(".player-right h2").text("Waiting for opponent...")
        gameRef.child(thisGameRoom).remove()
    })

    // when all players leave
    gameRef.on("value", function(snap) {

    })


    waitRef.on("value", function(snap) {
        if (thisGameRoom ==! 0) {
            return
        } else if (snap.numChildren() === 2) {
            // if there are 2 playres in waiting will move to a game room
            thisGameRoom = gameRoom
            
            msgOn = true
            chooseOn = true
            var thisSnap = snap.val() 
            gameRef.child(thisGameRoom).set(thisSnap)
            waitRef.child(player.id).remove()

            // record opponent key and name
            let playerKeys = Object.keys(thisSnap)
            playerKeys.forEach(function(element) {
                if (player.id !== element) {
                    opponent.id = element
                }
            })

            // add opponent to HTML
            opponent.name = thisSnap[opponent.id].player
            opponent.win = 0
            opponent.lose = 0
            player.win = 0
            player.lose = 0
            $(".player-right h2").text(`Opponent: ${opponent.name}`)
            $(".msg").append($("<div>").addClass("logoff").html(`<p>${opponent.name} has joined the game</p>`))
            $("#left-img").removeClass("disappear")
        }

        // disconnects
        waitRef.child(player.id).onDisconnect().remove()
    })

    gameRef.on("child_added", function(snap) {
        console.log(snap.val());
        
    })

    gameRef.on("value", function(snap) {
        // disconnects
        gameRef.child(gameRoom).child(player.id).onDisconnect().remove()
        
        // record opponent move
        var opponentMoved = snap.child(thisGameRoom).child(opponent.id).child("move")
        if (opponentMoved.exists() && player.move) {
            opponent.move = opponentMoved.val()

            $(".player-right h2").text(`Opponent: ${opponent.name}`)
            $("#right-img-choice").html($(`<img class="img-fluid" src="assets/images/${opponent.move}.png">`))

            checkWin(player.move, opponent.move)
        }

        // record opponents message
        var opponentMsg = snap.child(thisGameRoom).child(opponent.id).child("message")
        if (opponentMsg.exists()) {
            var thisMsg = opponentMsg.val()
            
            $(".msg").append($("<div>").addClass("othermsg").html(`<p><span class="msg-other-name">${opponent.name}:</span> <span class="msg-other-msg">${thisMsg}</span></p>`))
            $(".msg").scrollTop($(".msg").prop('scrollHeight'))
            gameRef.child(thisGameRoom).child(opponent.id).child("message").remove()
        }
    })
})

