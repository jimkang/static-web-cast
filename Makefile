include config.mk

pushall:
	git push origin main

try:
	node static-web-cast.js testbed/test-config.js testbed/file-info-cache.json > testbed/test.xml
	scp testbed/test.xml $(USER)@$(SERVER):$(TESTDIR)
