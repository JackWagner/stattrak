import { Request, Response } from 'express';
import { parseEvent, parseTicks } from '@laihoe/demoparser2';
import { DemoTick, PlayerDeathEvent, RoundEndEvent } from '../common/example/example.interface'

const filePath = "C:\\Users\\jules\\StatTrak\\demos\\nukeDemo.dem";

const killsPerRound = async (req: Request, res: Response) => {

    interface Kill extends PlayerDeathEvent {
        is_warmup_period: boolean;
        total_rounds_played: number;
        assister_last_place_name: string;
        attacker_last_place_name: string;
        user_last_place_name: string;
        assister_team_name: string;
        attacker_team_name: string;
        ct_team_name: string;
        t_team_name: string;
        user_team_name: string;
    }

    const kills: Array<Kill> = parseEvent(
        filePath,
        "player_death",
        ["last_place_name", "team_name"],
        ["total_rounds_played", "is_warmup_period"]
    );

    const killsNoWarmup = kills.filter(kill => kill.is_warmup_period === false);
    const validKills = killsNoWarmup.filter(kill => kill.attacker_team_name != kill.user_team_name);
    const latestRoundWithKill = Math.max(...kills.map(kill => kill.total_rounds_played));

    const killsPerPlayer: Map<string, number> = new Map();
    for(let round = 0; round <= latestRoundWithKill; round++) {
        const killsThisRound = validKills.filter(kill => kill.total_rounds_played == round);
        killsThisRound.forEach(kill => {
            const attackerName = kill.attacker_name;
            if(killsPerPlayer.has(attackerName))
                killsPerPlayer.set(attackerName, killsPerPlayer.get(attackerName)! + 1);
            else   
                killsPerPlayer.set(attackerName, 1);
        });
    };

    return res.status(200).json({
        message: JSON.stringify(Object.fromEntries(killsPerPlayer))
    });

};


export default { killsPerRound };