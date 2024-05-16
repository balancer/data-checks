run_deploy() {
    folder="$1"
    if [ -d "$folder" ]; then
        (cd "$folder" && npm run deploy)
    else
        echo "Directory $folder does not exist."
    fi
}

if [ -n "$1" ]; then
    run_deploy "src/$1"
    exit 0
fi

for workspace in src/*; do
    if [ -d "$workspace" ]; then
        run_deploy "$workspace"
    fi
done
