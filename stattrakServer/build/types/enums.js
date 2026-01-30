"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchResult = exports.RoundEndReason = exports.Team = void 0;
var Team;
(function (Team) {
    Team["CT"] = "CT";
    Team["T"] = "T";
    Team["SPECTATOR"] = "SPECTATOR";
    Team["UNASSIGNED"] = "UNASSIGNED";
})(Team || (exports.Team = Team = {}));
var RoundEndReason;
(function (RoundEndReason) {
    RoundEndReason["TARGET_BOMBED"] = "TARGET_BOMBED";
    RoundEndReason["BOMB_DEFUSED"] = "BOMB_DEFUSED";
    RoundEndReason["CT_WIN"] = "CT_WIN";
    RoundEndReason["T_WIN"] = "T_WIN";
    RoundEndReason["CT_ELIMINATION"] = "CT_ELIMINATION";
    RoundEndReason["T_ELIMINATION"] = "T_ELIMINATION";
    RoundEndReason["TIME_RAN_OUT"] = "TIME_RAN_OUT";
    RoundEndReason["HOSTAGES_RESCUED"] = "HOSTAGES_RESCUED";
    RoundEndReason["TARGET_SAVED"] = "TARGET_SAVED";
    RoundEndReason["DRAW"] = "DRAW";
})(RoundEndReason || (exports.RoundEndReason = RoundEndReason = {}));
var MatchResult;
(function (MatchResult) {
    MatchResult["WIN"] = "WIN";
    MatchResult["LOSS"] = "LOSS";
    MatchResult["TIE"] = "TIE";
})(MatchResult || (exports.MatchResult = MatchResult = {}));
