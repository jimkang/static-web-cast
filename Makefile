include config.mk

pushall:
	git push origin main

try:
	node static-web-cast.js testbed/meta > testbed/test.xml
	scp testbed/test.xml $(USER)@$(SERVER):$(TESTDIR)
