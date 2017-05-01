# Node.js devkat Webserver for RocketMap

An asynchronous Node.js webserver on Express.js that uses Handlebars for templating (with enabled view caching), Sequelize for ORM, and that supports gzip compression and load limiting with toobusy-js

## Installation Instructions

1. Read the license in LICENSE.md.
1. Clone the git repository to a local folder.
1. Run the following commands:
    ```
    npm install
    ```
1. Copy `.env.example` to `.env`.
1. Edit the `.env` configuration file. The only required changes are the database settings, all others are optional.