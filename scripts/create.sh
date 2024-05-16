mkdir "src/$1"
cp templates/* "src/$1/"
sed -i '' "s/\$name/$1/g" "src/$1/package.json"
sed -i '' "s/\$name/$1/g" "src/$1/wrangler.toml"
(cd src/$1 && npm i)
sh ./scripts/typegen.sh $1
