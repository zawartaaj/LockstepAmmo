# Lockstep
Demo of lockstep networked multi-user simulation.

## Using the app
In this demo, multiple users can (from their web browsers) open a url to where the index.html is located and open a Javascript demo where the user can click on the box in the center of the browser window to add balls which will bounce around (this is the "simulation"). If other users are currently using the app, each will see a colored mouse pointer for the other users and the state of the simulation (the balls bouncing around) will be kept in "lockstep" between them.

## How it works
The two main approaches to multi-user networked simulations:
- central server runs simulation, takes user inputs and send users state changes 
- clients run simulation in "lockstep", share user inputs between clients (perhaps relayed by a server)

Under ideal conditions they're equivalent, but each has advantages under constraints such as net bandwidth, latency, relative bandwidth of inputs vs state changes for the given application, etc.

In a lockstep system, to ensure the simulation produces the same state on each client, clients need to ensure that they start with the same state (whenever a client joins the simulation) and that at each synchronization step that all clients:
- agree on current set of clients
- have all inputs to be applied to the next step
- apply inputs in the same order

### Magic tricks
To keep the simulation running at a high frame rate, a number of simulation steps are carried out between each input syncing step. This ratio is currently fixed to a number which is reasonable for typical use cases, but could be dynamically optimized. In the code, I refer to the simulation steps as "simSteps" and the synchronization steps (points) as "syncSteps".

The current code applies the inputs taken between syncStep T and T+1 to the simulation at the start of T+1. This is done by all clients pausing on sync steps to wait to get the latest inputs from the other clients. For higher latency situations, it may be better to shift this to apply those inputs to T+2 and possibly shorten the number of simSteps between each syncStep. This would allow simSteps to be taking place while the inputs are being communicated.

The mouse position of the local user is shared periodically (if it's changed) with other users. This period length is a parameter that could be adjusted to balance bandwidth usage with latency of remotely visible changes and might (ideally) be adaptively adjusted depending on the bandwidth constraints of the users.

### Verification
To ensure client states are synchronized, a hash of the state of the simulation can be shared and verified periodically.

## How to develop and run locally

##notes
There are two different VSCode run scripts

## Development & how to develop and run locally
This demo project was written using the VSCode IDE and has launch scripts (the the .vscode folder)
that make developing/debugging it in VSCode convenient. 

To use it, you need:
- to run webserver to serve the files for the web client
- to run a node.js server to host the WebSockets server
- to open a web browser with the URL to the webserver page for the client

### Running a web server locally
Open a terminal, move to the project folder and run:

    node local-web-server/main.js

### Running the node websockets server locally
Open a terminal, move to the project folder and run:

    node server/main.js

Or to run in the VSCode debugger:

-  click the "Run & Debug" button 
    (it's on the left side of the VSCode window with a arrow+bug icon)
- select the "node: websocket server" from the "RUN AND DEBUG" pull down menu on the top
    left of the window
- click the run button (the right arrow icon button to the left of the pull down menu)
- select the "DEBUG CONSOLE" tab in the debugger pane, to see the output

### Launching the client to use the local server

Open a web browser to the URL:

    https://localhost:9000/index.html

Or to run in the client in the VSCode debugger:

-  click the "Run & Debug" button 
    (it's on the left side of the VSCode window with a arrow+bug icon)
- select the "chrome: open client page" from the "RUN AND DEBUG" pull down menu on the top
    left of the window
- click the run button (the right arrow icon button to the left of the pull down menu)
- select the "DEBUG CONSOLE" tab in the debugger pane, to see the output

### Notes on VSCode
I've found it difficult to debug both the client and server in VSCode at the same time, 
so I usually only debug one at a time and run the other externally 
(the client in a browser, or the server from a terminal). 

