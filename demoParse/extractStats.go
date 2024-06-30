package main

import (
	"fmt"
	"log"
	"os"

	dataframe "github.com/go-gota/gota/dataframe"
	series "github.com/go-gota/gota/series"
	dem "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs"
	events "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/events"
)

//TeamCounterTerrorists() *common.TeamState
// TeamTerrorists returns the TeamState of the T team.
//
// Make sure to handle swapping sides properly if you keep the reference.
//TeamTerrorists() *common.TeamState
// Participants returns a struct with all currently connected players & spectators and utility functions.
// The struct contains references to the original maps so it's always up-to-date.

func getTeamFlashes(p dem.Parser) dataframe.DataFrame {
	Players := series.New([]string{}, series.String, "Players")
	Attackers := series.New([]string{}, series.String, "Attackers")
	FlashDurations := series.New([]float64{}, series.Float, "Flash Durations")

	team_info_aquired := false

	// Register handler on flashbang events and print summary string
	p.RegisterEventHandler(func(e events.PlayerFlashed) {
		if !team_info_aquired && p.GameState().IsMatchStarted() {
			team_1 := p.GameState().TeamCounterTerrorists().Members()
			team_2 := p.GameState().TeamTerrorists().Members()
			fmt.Println("CT's:")
			fmt.Println(team_1)
			fmt.Println("T's:")
			fmt.Println(team_2)
			team_info_aquired = true
		}

		if e.Attacker.Team == e.Player.Team {
			Players.Append([]string{e.Player.Name})
			Attackers.Append([]string{e.Attacker.Name})
			FlashDurations.Append([]float64{float64(e.FlashDuration())})
			fmt.Printf("%s teamflashed %s for %s\n", e.Attacker, e.Player, e.FlashDuration())
		}
	})

	// Parse to end
	err := p.ParseToEnd()
	if err != nil {
		log.Panic("failed to parse demo: ", err)
	}

	// Create a dataframe from the data
	return dataframe.New(
		Players,
		Attackers,
		FlashDurations,
	)
}

func main() {
	f, err := os.Open("/Users/vldt-jww/demos/example.dem")
	if err != nil {
		log.Panic("failed to open demo file: ", err)
	}
	defer f.Close()

	p := dem.NewParser(f)
	defer p.Close()

	df := getTeamFlashes(p)

	// Print dataframe
	fmt.Println(df)

	// Summary statistics
	fmt.Println(df.Describe())
}
