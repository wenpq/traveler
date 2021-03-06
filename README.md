# Traveler

# Instalation
For detailed deployment instructions please see https://confluence.aps.anl.gov/display/APSUCMS/Developer+Guide+for+the+Traveler+Module

**Deployment of the traveler module:**

    # Make a new directory to hold the traveler module and its support
    mkdir traveler
    cd traveler
    git clone https://github.com/iTerminate/traveler.git distribution
    cd distribution
    # Install all of the support software
    make support
    # Automate configuration of the application
    make default-config
    # Navigate to configuration directory
    cd ../etc/traveler-config
    # End of output from make dev-config has a list of file(s) that need to be edited
    nano ad.json

**Starting the traveler module:**

    # Navigate to the distirbution of the traveler module
    # When using the support mongodb, start the mongodb part of support
    ./etc/init.d/traveler-mongodb start
    # It is good to start the project using node to make sure everything works properly.
    source setup.sh
    node app.js
    # When everything works, start traveler as daemon
    ./etc/init.d/traveler-webapp start
    # Check progress of traveler-webapp
    ./etc/init.d/traveler-webapp status

# Lint
Recommend to use [ESLint](http://eslint.org/) to lint the code before committing. The ESLint configuration file is `.eslintrc`. [JSFormat](https://github.com/jdc0589/JsFormat) or other beautifiers may help. The JSformat user configuration file is `jsformat.json`.

# License
[MIT](https://github.com/dongliu/traveler/blob/master/LICENSE.md)
