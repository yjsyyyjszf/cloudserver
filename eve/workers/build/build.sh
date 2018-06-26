#!/bin/bash
set -exo pipefail
if [[ "$BUILDBOT_VERSION" ]]; then
         mkdir -p /usr/share/man/man1
         apt-get update -yqq
         cat ./eve/workers/build/*packages.list | xargs apt-get install -y 
         pip install pip==9.0.1 
         gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 
         #curl -sSL https://get.rvm.io | bash -s stable --ruby=${RUBY_VERSION:-"2.4.1"}
         #usermod -a -G rvm root
         #/bin/bash -lc "
         #source /usr/local/rvm/scripts/rvm \
         cat ./eve/workers/build/gems.list | xargs gem install
         pip install -r ./eve/workers/build/requirements.txt
         mkdir /home/eve/.aws
fi
