

# Dockerfile

Learn how to install the Doppler CLI in your Docker image to inject secrets at container runtime.

## Prerequisites

* You've run applications in Docker and have experience building Docker images.

## Installation

This method installs the Doppler CLI in your Docker image to inject secrets at container runtime.

```dockerfile Debian/Ubuntu
# Install Doppler CLI
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg && \
    curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list && \
    apt-get update && \
    apt-get -y install doppler
```

```dockerfile Alpine
# Install Doppler CLI
RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub && \
    echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories && \
    apk add doppler
```

```dockerfile RedHat/CentOS
# Install Doppler CLI
RUN rpm --import 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' && \
    curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/config.rpm.txt' | tee /etc/yum.repos.d/doppler-cli.repo && \
    yum update -y && \
    yum install -y doppler
```

```dockerfile Shell Script
# Does not rely on package managers

# Requires curl and gnupg:
#        Alpine: apk add curl gnupg
#   CentOS/RHEL: yum install -y curl gnupg
# Ubuntu/Debian: apt install -y curl GnuPG

RUN (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh
```

Your `Dockerfile` will then need to use `doppler run` in either the `ENTRYPOINT` or `CMD` to fetch your secrets at container runtime. As a general rule, `CMD` is the easiest way to get started, but we'll explore both options below.

## CMD

Unless you're an experienced Docker user, we recommend using the `CMD` method as it requires minimal changes to your `Dockerfile`:

```dockerfile Dockerfile
CMD ["doppler", "run", "--", "your-command-here"]
```

* Doesn't require an understanding of the difference between `ENTRYPOINT` and `CMD`
* GoodSimple as it works with an existing `ENTRYPOINT` without requiring changes
* Easily able to bypass the Doppler CLI by overriding the `CMD` at container runtime

## ENTRYPOINT CLI

Setting Doppler as the `ENTRYPOINT` means any command, whether that be the defined `CMD` in the `Dockerfile` or if it's overridden when calling `docker run` will be spawned by the Doppler CLI:

```dockerfile Dockerfile
ENTRYPOINT ["doppler", "run", "--"]
CMD ["your-command-here"]
```

The Doppler CLI also takes care of forwarding signals from the container runtime to your application process.'

* Ensures any command used to run the container will have Doppler injected environment variables
* Requires knowledge of `ENTRYPOINT` vs. `CMD`
* Requires integrating into an existing `ENTRYPOINT` command or script if defined
* Bypassing the use of the Doppler CLI in your `ENTRYPOINT` is tricky

## ENTRYPOINT Script

Using an `ENTRYPOINT` script requires a significantly deeper knowledge of how containers work and in short, it's best to avoid them whenever possible.

I'll provide a brief overview of how an `ENTRYPOINT` script works below but I would recommend learning in more depth the [differences between CMD and ENTRYPOINT](https://goinbigdata.com/docker-run-vs-cmd-vs-entrypoint/) if you want to pursue this route.

For a complete example, here is a `Dockerfile` with a script for the ENTRYPOINT`and a default`CMD\`:

```dockerfile Dockerfile
FROM alpine

RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub && \
    echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories && \
    apk add doppler

COPY entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["printenv"] # Testing purposes only!
```

And as is typical for an `ENTRYPOINT` script, `exec` will be used to execute the `CMD` or command. Using `exec` replaces the `entrypoint.sh` process as the new PID 1 in the container.

The replacement of the container PID 1 process means your application process will now receive any signals sent by the container runtime such as `SIGINT` to trigger a graceful shutdown of your application.

```shell entrypoint.sh
#! /usr/bin/env sh

# entrypoint.sh

echo "[info]: Starting application with command - \"${@}.\""
exec "$@"
```

To clarify things further, if `exec` wasn't used and we executed the command as-is, the application would appear to start just like before. But this time, the `entrypoint.sh` process remains PID 1 and the `CMD` or command is spawned as a child process.

```shell
#! /usr/bin/env sh

# entrypoint.sh

echo "[info]: Starting application with command - \"${@}.\""
"$@"
```

This means a signal such as `SIGINT` will be received by the `entrypoint.sh` process, **not** your application. Because your application continues to run, oblivious to any signal sent to the container, the container must be forcibly killed after the allotted grace period.

If you've ever run a container and haven't been able to stop it using `CTRL+C` for example, a lack of signal forwarding is most likely why.

Your app should always terminate gracefully and this is especially important when essential cleanup is required in order to not leave external services in a bad state.

Moving our focus back to  the `Dockerfile`, the simplest option is to update the `CMD` to include the `doppler run` command just like we did earlier as this requires no changes to the `ENTRYPOINT` script:

```dockerfile
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["doppler", "run", "--", "printenv"] # Testing purposes only!
```

But if you wanted to force every command to be run by the Doppler CLI, then you'll need to update your `ENTRYPOINT` script to use `doppler run`:

```shell
#! /usr/bin/env sh

# entrypoint.sh

echo "[info]: Starting application with command - \"${@}\""
exec doppler run -- "$@"
```

## Running the Container

Accessing your secrets in production or CI/CD environments requires a  [Service Token](https://docs.doppler.com/docs/service-tokens) to provide read-only access to a specific Config within a Project.

When installing the Doppler CLI in your Docker image, the `DOPPLER_TOKEN` environment variable must be provided to the container so it can fetch secrets:

```shell
# The $DOPPLER_TOKEN environment variable should be injected by your platform or deployment process.

docker run -e DOPPLER_TOKEN="$DOPPLER_TOKEN" your-application
```

## Local Development

For local development, an ephemeral Service Token is created each time the container is run:

```shell
docker run --rm -it \
  -e DOPPLER_TOKEN="$(doppler configs tokens create docker --max-age 1m --plain)" \
  node-alpine
```

## Troubleshooting

### Base Images with No User Home Directory

The Doppler CLI expects the user it's running as to have `HOME` set to a directory it can write to. When `doppler run` first executes, it creates its configuration directory at `$HOME/.doppler`. If `HOME` isn't set to a writable directory, you may see an error similar to this:

```text
Unable to create config directory /nonexistent/.doppler
Doppler Error: mkdir /nonexistent/.doppler: no such file or directory
```

To get around this problem you can use the `--config-dir` flag to pass in another directory you'd like the CLI to use:

```shell
doppler run --config-dir /tmp/.doppler -- your-application
```

You can also configure this location by setting the `DOPPLER_CONFIG_DIR` environment variable if you'd rather not hardcode the location in your image.

> 📘
>
> Need more guidance? Reach out via in-product support or in our [Community Portal](https://community.doppler.com/)

> 👍 Amazing Work!
>
> The Doppler CLI is now ready to inject secrets within your containerized application!