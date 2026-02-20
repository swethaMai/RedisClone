https://architecturenotes.co/p/redis

## Definition
- Redis -> REmote DIctionary Service
- key-value database (NoSQL)
- data structure server ? 
	- stores native data structures not raw values
	- perform operations on them in server
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
## Architectures
- 


# PING (no args) -> PONG
redis-cli -p 6379 ping

# PING (with message) -> echoes as bulk string
redis-cli -p 6379 ping "hello"

# ECHO
redis-cli -p 6379 echo "hi there"

# SET / GET
redis-cli -p 6379 set foo bar
redis-cli -p 6379 get foo

# EX seconds
redis-cli -p 6379 set temp value EX 1
sleep 2
redis-cli -p 6379 get temp    # -> (nil)

# PX milliseconds
redis-cli -p 6379 set t v PX 150
sleep 1
redis-cli -p 6379 get t       # -> (nil)

# Errors
redis-cli -p 6379 get         # wrong arity
redis-cli -p 6379 foobar      # unknown command