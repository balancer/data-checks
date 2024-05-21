run_cf_typegen() {
    folder="$1"
    if [ -d "$folder" ]; then
        (cd "$folder" && npm run cf-typegen)
    else
        echo "Directory $folder does not exist."
    fi
}

if [ -n "$1" ]; then
    run_cf_typegen "src/$1"
    exit 0
fi

for workspace in src/*; do
    if [ -d "$workspace" ]; then
        run_cf_typegen "$workspace"
    fi
done
