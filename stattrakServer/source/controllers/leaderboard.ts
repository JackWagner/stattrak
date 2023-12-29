import { Request, Response } from 'express';
import { parseEvent } from '@laihoe/demoparser2';
import { LeaderBoard, LeaderBoardRecord, TeamEvent } from '../common/example/example.interface'
import { getKills } from './kills';
import { getFlashes } from './flashes';
const filePath = "C:\\Users\\jules\\StatTrak\\demos\\nukeDemo.dem";

const getPlayers = (): TeamEvent[] => {
    return parseEvent(filePath, "player_team") as TeamEvent[];
}

const getLeaderBoard = async (req: Request, res: Response) => {

    const leaderboard: LeaderBoard = {
        playerRecords: new Array<LeaderBoardRecord>
    }

    let players = getPlayers();
    let killRecords = getKills();
    let flashRecords = getFlashes(players);

    players.forEach(player => {
        const flashRecord = flashRecords.get(player.user_name);
        const playerRecord: LeaderBoardRecord = {
            user_name: player.user_name,
            user_steamid: player.user_steamid,
            user_kills: killRecords.get(player.user_name) ?? 0,
            flashes_thrown: flashRecord?.flashes_thrown ?? 0,
            total_flashes: flashRecord?.total_flashes ?? 0,
            clean_flashes: flashRecord?.clean_flashes ?? 0,
            team_flashes: flashRecord?.team_flashes ?? 0,
            total_flash_time: flashRecord?.total_flash_time ?? 0,
            clean_flash_time: flashRecord?.clean_flash_time ?? 0,
            team_flash_time: flashRecord?.team_flash_time ?? 0
        }
        leaderboard.playerRecords.push(playerRecord);
    });

    return res.status(200).json({
        message: leaderboard
    });
    
}

export default { getLeaderBoard };