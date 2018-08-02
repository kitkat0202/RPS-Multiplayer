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
    var gameRoom
    var thisGameRoom = 0
    var chooseOn = true
    var msgOn = false


    // function at tie
    let tie = () => {
        console.log("tie")
        $(".win-lose h1").text("Tie Game")
        $(".win-lose").addClass("tie")
        $(".win-lose").removeClass("disappear")
    }

    // function at win
    let win = () => {
        console.log("wins")
        player.win = player.win + 1
        opponent.lose = opponent.lose + 1
        $(".left-win-score").text(player.win)

        $(".win-lose h1").text("Winner!!")
        $(".win-lose").addClass("winner")
        $(".win-lose").removeClass("disappear")
    }

    // function at lose
    let lose = () => {
        console.log("lose")
        player.lose = player.lose + 1
        opponent.win = opponent.win + 1
        $(".left-lose-score").text(player.lose)

        $(".win-lose h1").text("You Lose...")
        $(".win-lose").addClass("loser")
        $(".win-lose").removeClass("disappear")
    }

    // restart
    let restart = () => {
        // remove color from popup
        var arrayWinLoseColorCheck = ["winner", "loser", "tie"]
        arrayWinLoseColorCheck.forEach(function(element) {
            if ($(".win-lose").hasClass(element)) {
                $(".win-lose").removeClass(element)
            }
        })

        // remove color filter from choices
        var arrayFilterCheck = ["rock", "paper", "scissors"]
        arrayFilterCheck.forEach(function(element) {
            if ($(`#left-img .col-4 > #${element}`).hasClass("grayscale")) {
                $(`#left-img .col-4 > #${element}`).removeClass("grayscale")
            }
        })

        // reset moves
        player.move = ""
        opponent.move = ""
        gameRef.child(thisGameRoom).child(player.id).child("move").remove()

        $(".win-lose").addClass("disappear")
        $("#right-img").empty()
        chooseOn = true
    }


    // Check win lose
    let checkWin = (choice1, choice2) => {
        if (choice1 === choice2) {
            tie()
            setTimeout(() => {
                $(".win-lose").removeClass("tie")
                restart()
            }, 3000);
        } else if ((choice1 === "rock" && choice2 === "scissors") || (choice1 === "scissors" && choice2 === "paper") || (choice1 === "paper" && choice2 === "rock")) {
            win()
            setTimeout(() => {
                $(".win-lose").removeClass("winner")
                restart()
            }, 3000);
        } else if ((choice1 === "scissors" && choice2 === "rock") || (choice1 === "paper" && choice2 === "scissors") || (choice1 === "rock" && choice2 === "paper")) {
            lose()
            setTimeout(() => {
                $(".win-lose").removeClass("loser")
                restart()
            }, 3000);
        }
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
            $(".container-fluid").removeClass("disappear")
            $(".player-left h2").text(`Player: ${player.name}`)

            waitRef.child(player.id).set({
                player: player.name
            })
        }
    })

    // saving player choice
    $("#left-img .col-4 img").on("click", function() {
        if (chooseOn) {
            player.move = $(this).attr("data-choice")
            $(" img").addClass("grayscale")
            $(this).removeClass("grayscale")
            
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
                $(".msg").append($("<div>").addClass("mymsg").html(`<p><span class="msg-name">${player.name}:</span> ${player.message}</p>`))
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
    // connectionsRef.on("value", function(snap) {
    //     $(".view-number").text(snap.numChildren())
    // })


    gameRef.on("value", function(snap) {
        // keeps track of number of game rooms
        if (snap.child("0").exists()) {
            gameRoom = snap.numChildren()
        } else {
            gameRoom = 0
        }

        // record opponent move
        var opponentMoved = snap.child(thisGameRoom).child(opponent.id).child("move")
        if (opponentMoved.exists() && player.move) {
            opponent.move = opponentMoved.val()

            $(".player-right h2").text(`Opponent: ${opponent.name}`)
            $("#right-img").html($(`<img class="img-fluid" src="assets/images/${opponent.move}.png">`))

            checkWin(player.move, opponent.move)
        }

        // record opponents message
        var opponentMsg = snap.child(thisGameRoom).child(opponent.id).child("message")
        if (opponentMsg.exists()) {
            var thisMsg = opponentMsg.val()
            $(".msg").append($("<div>").addClass("othermsg").html(`<p><span class="msg-name">${opponent.name}:</span> ${thisMsg}`))
            $(".msg").scrollTop($(".msg").prop('scrollHeight'))
            gameRef.child(thisGameRoom).child(opponent.id).child("message").remove()
        }

        // disconnects
        gameRef.child(gameRoom).child(player.id).onDisconnect().remove()
    })


    // when player leaves from game room
    gameRef.child(thisGameRoom).on("child_removed", function(snap) {
        waitRef.child(player.id).set({
            player: player.name
        })
        msgOn = false
        $(".msg").empty()
        $(".msg").append($("<div>").addClass("logoff").html(`<p>${opponent.name} has logged off</p>`))
        $(".player-right h2").text("Waiting for opponent...")
        gameRef.child(thisGameRoom).remove()
    })


    waitRef.on("value", function(snap) {
        if(snap.numChildren() === 2) {
            // if there are 2 playres in waiting will move to a game room
            gameRoom = thisGameRoom
            msgOn = true
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
})

