package main

import (
	"fmt"
	"log"
	"os"

	dem "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs"
	events "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/events"
)

func main() {
	f, err := os.Open("/Users/vldt-jww/demos/example.dem")
	if err != nil {
		log.Panic("failed to open demo file: ", err)
	}
	defer f.Close()

	p := dem.NewParser(f)
	defer p.Close()

	// Register handler on flashbang events and print summary string
	p.RegisterEventHandler(func(e events.PlayerFlashed) {
		fmt.Printf("%s flashed %s for %s\n",e.Attacker,e.Player,e.FlashDuration())
	})

	// Parse to end
	err = p.ParseToEnd()
	if err != nil {
		log.Panic("failed to parse demo: ", err)
	}
}