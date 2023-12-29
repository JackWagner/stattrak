import { Request, Response } from 'express';
import { parseEvent, parseGrenades } from '@laihoe/demoparser2';
import { FlashEvent, FlashStat, TeamEvent } from '../common/example/example.interface'

const filePath = "C:\\Users\\jules\\StatTrak\\demos\\nukeDemo.dem";


interface FlashEventWarmup extends FlashEvent {
    attacker_is_warmup_period: boolean,
    is_warmup_period: boolean,
    user_is_warmup_period: boolean,
    user_team_num: number,
    attacker_team_num: number
}

const getFlashesThrownByPlayer = (): Map<string, number> => { 
    const grenades = parseGrenades(filePath);
    const flashes = grenades.filter((grenade: any) => grenade.grenade_type === 'flashbang');
    
    const distinctFlashes = flashes.filter((value: any, index: any, self: any) =>
        index === self.findIndex((t: any) => (
            t.entity_id === value.entity_id
        ))
    );
    console.log(distinctFlashes);

    const playerFlashes = new Map<string, number>();
    distinctFlashes.forEach((flash: any) => {
        if (playerFlashes.has(flash.name)) {
            playerFlashes.set(flash.name, playerFlashes.get(flash.name)! + 1)
        } else {
            playerFlashes.set(flash.name, 1);
        }
    });

    return playerFlashes;
    
}

const getFlashEvents = (): FlashEventWarmup[] => {
    const flashEvents: FlashEventWarmup[] = parseEvent(filePath, "player_blind", ["is_warmup_period", "team_num"])
    .filter((event: FlashEventWarmup) => event.is_warmup_period === false);
    return flashEvents;
}

export const getFlashes = (players: TeamEvent[]): Map<string, FlashStat>=> {

    let leaderboard = new Map<string, FlashStat>();
    const flashEvents = getFlashEvents();
    const flashesByPlayer = getFlashesThrownByPlayer();
    flashEvents.forEach(event => {
        const isTeamFlash = event.user_team_num === event.attacker_team_num;
        if(leaderboard.has(event.user_name)) {
            const record = leaderboard.get(event.user_name);
            if(isTeamFlash) {
                record!.team_flashes++;
                record!.team_flash_time += event.blind_duration;
            }
            else{
                record!.clean_flashes++;
                record!.clean_flash_time += event.blind_duration;
            }
            record!.total_flashes++;
            record!.total_flash_time += event.blind_duration;
            leaderboard.set(event.user_name, record!);
        }
        else {
            const record: FlashStat = {
                username: event.user_name,
                team_flashes: isTeamFlash ? 1 : 0,
                clean_flashes: isTeamFlash ? 0 : 1,
                flashes_thrown: flashesByPlayer.get(event.user_name) ?? 0,
                total_flashes: 1,
                team_flash_time: isTeamFlash ? event.blind_duration : 0,
                clean_flash_time: isTeamFlash ? 0 : event.blind_duration,
                total_flash_time: event.blind_duration
            }
            if(event.user_team_num === event.attacker_team_num)
                record!.team_flashes++;
            else
                record!.clean_flashes++;
            record!.total_flashes++;
            leaderboard.set(event.user_name, record);
        }
    });

    return leaderboard;
}

const getLeaderBoard = async (req: Request, res: Response) => {

    return res.status(500).json({
        message: "not implemented"
    });
    
}

export default { getLeaderBoard };