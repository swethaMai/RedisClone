https://architecturenotes.co/p/redis

## Definition
- Redis -> REmote DIctionary Service
- key-value database (NoSQL)
- data structure server ? 
	- stores native data structures not raw values
	- perform operations on them in server
- stores raw bytes
## Uses
- used as cache in front of other database like MySQL
- now used as full fledged database system
## Data types
- String
- Bitmap
- Bitfield
- Hash
- List
- Set
- Sorted Set
- Geospatial
- Hyperlog
- Stream
## Commands
### PING
#### Purpose
- To check if the server/connection is alive
- Used as a simple “health check” command
#### Behavior
- When run without arguments → returns PONG
- When run with an argument → returns the same argument back (echo-like)
### ECHO
#### Purpose
- Prints/returns the exact string passed to it
- Often used for debugging or verifying output
#### Behavior
- Returns the argument as a plain string
`ECHO "This is a test"`
### SET
#### Purpose
- Stores data (fields and values) under a specified key
- Allows multiple fields to be set at once
#### Behavior
- Creates a new key if it doesn’t exist
- Updates the key's fields if it already exists
`SET user:123 name "John Doe" email "john@example.com" age 30`
- This command sets the values for the key user:123
### GET 
#### Purpose
- retrieve value associated with specific key
- `GET user:123:name`
- This command retrieves the value of the name field for the key user:123






- supports TTL via EX or PX
- TTL -> Time To Live 
	amount of time a key must be alive in database before automatically expiring
- EX -> expiration time in sec
- PX -> expiration time in millisec
`SET user:123 name "John" EX 60`
`SET session:abc token "xyz" PX 1500`