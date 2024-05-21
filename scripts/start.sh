if [ -n "$1" ]; then
    (cd "src/$1" && npm start)
fi
