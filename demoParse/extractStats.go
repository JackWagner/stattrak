package main

import (
	"fmt"
	"log"
	"os"

	dataframe "github.com/go-gota/gota/dataframe"
	series "github.com/go-gota/gota/series"
	dem "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs"
	common "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/common"
	events "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/events"
)

//TeamCounterTerrorists() *common.TeamState
// TeamTerrorists returns the TeamState of the T team.
//
// Make sure to handle swapping sides properly if you keep the reference.
//TeamTerrorists() *common.TeamState
// Participants returns a struct with all currently connected players & spectators and utility functions.
// The struct contains references to the original maps so it's always up-to-date.

func getPlayers(p dem.Parser) []*common.Player {
	var all_players []*common.Player
	p.RegisterEventHandler(func(e events.PlayerFlashed) {
		if p.GameState().IsMatchStarted() {
			team_1 := p.GameState().TeamCounterTerrorists().Members()
			team_2 := p.GameState().TeamTerrorists().Members()
			all_players = append(team_1[:], team_2[:]...)
			//p.Close()
		}
	})
	return all_players
}

func getTeamFlashes(p dem.Parser) dataframe.DataFrame {
	Players := series.New([]string{}, series.String, "Players")
	Attackers := series.New([]string{}, series.String, "Attackers")
	FlashDurations := series.New([]float64{}, series.Float, "Flash Durations")

	// Register handler on flashbang events and print summary string
	p.RegisterEventHandler(func(e events.PlayerFlashed) {
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

func getKills(p dem.Parser) dataframe.DataFrame {
	victim := series.New([]string{}, series.String, "Victim")
	killer := series.New([]string{}, series.String, "Killer")
	time := series.New([]int64{}, series.Int, "Time (ms)")
	p.RegisterEventHandler(func(e events.Kill) {
		victim.Append([]string{e.Victim.Name})
		killer.Append([]string{e.Killer.Name})
		time.Append([]int64{p.CurrentTime().Milliseconds()})
	})
	return dataframe.New(victim, killer, time)
}

func getInjuries(p dem.Parser) dataframe.DataFrame {
	victim := series.New([]string{}, series.String, "Victim")
	attacker := series.New([]string{}, series.String, "Attacker")
	healthDamage := series.New([]int64{}, series.Int, "Health Damage")
	armorDamage := series.New([]int64{}, series.Int, "Armor Damage")
	time := series.New([]int64{}, series.Int, "Time (ms)")
	p.RegisterEventHandler(func(e events.PlayerHurt) {
		victim.Append([]string{e.Player.Name})
		attacker.Append([]string{e.Attacker.Name})
		healthDamage.Append([]int64{int64(e.HealthDamageTaken)})
		armorDamage.Append([]int64{int64(e.ArmorDamageTaken)})
		time.Append([]int64{p.CurrentTime().Milliseconds()})
	})
	return dataframe.New(victim, attacker, healthDamage, armorDamage, time)
}

func main() {
	f, err := os.Open("/Users/vldt-jww/demos/example.dem")
	if err != nil {
		log.Panic("failed to open demo file: ", err)
	}
	defer f.Close()

	p := dem.NewParser(f)
	defer p.Close()

	players := getPlayers(p)
	fmt.Printf("Number of Players = %d\n", len(players))

	df := getTeamFlashes(p)

	// Print dataframe
	fmt.Println(df)

	// Summary statistics
	fmt.Println(df.Describe())
}
