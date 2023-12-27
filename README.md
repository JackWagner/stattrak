
# stattrak

Counter-Strike 2 gameplay aggregator and stat collector

## Sources

- ./stattrak
    - Front End using TypeScript React
- ./stattrakServer
    - Back End TypeScript API for parsing game files
        - express
	    - @laihoe/demoparser
	    - morgan
	    - typescript
- ./demoETL
    - Python ETL pipeline for moving demo files
        - Data sources:
            - CS2 MM
            - Faceit (TBD)
            - ESEA (TBD)
	- Asynchronous match completion detection & handling
	- PostgreSQL for storing match metadata
