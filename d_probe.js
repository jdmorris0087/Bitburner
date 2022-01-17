import {allservers,getConfig,setConfig} from "utils.js";

export async function main(ns){
	//home not included in allservers search. will add after dynamic calculations are over. line 54.
	const ALL_SERVERS = allservers(ns, false);
	const EXECUTABLES = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
	let CONFIG = getConfig(ns);
	let reserved = CONFIG.reservedRAM.home;
	const LBS = ns.getPortHandle(1);
	const AZS = ns.getPortHandle(2);
	const PRL = ns.getPortHandle(5);
	const LL = ns.getPortHandle(7);
	
	//will update the given list of servers mRam
	function updatePServers(csl, ups){
		//update home max ram since it is not returned by ns.getPurchasedServers()
		csl[0].mRam = ns.getServerMaxRam("home") - reserved;
		let i = csl.findIndex(c => {
			return c.hostname == ups;
		});
		if(i >= 0){
			csl[i].mRam = ups.mRam;	
		}
		else{
			csl.push(ups);
		}
	}
	
	let hlvl = 0;
	let oldPriority = {
		"hostname": "NOT A SERVER"
	};
	let servers = [];
	let home = {
			"hostname": "home",
			"root": true,
			"mRam": ns.getServerMaxRam("home") - reserved,
			"threads": "",
			"maxMoney": 0,
			"avaMoney": 0,
			"minSecurity": 0,
			"level": 0,
			"personal": true,
			"primed": false
	};
	
	servers = ALL_SERVERS.map((as) => {
		return {
			"hostname": as,
			"root": false,
			"mRam": ns.getServerMaxRam(as),
			"threads": "",
			"maxMoney": ns.getServerMaxMoney(as),
			"avaMoney": 0,
			"minSecurity": ns.getServerMinSecurityLevel(as),
			"level": ns.getServerRequiredHackingLevel(as),
			"personal": false,
			"primed": false
		}
	}).unshift(home);
	//places home at the 0 index of servers
	
	let pservers = ns.getPurchasedServers().map(s => {
			return {
				"hostname": s,
				"root": true,
				"mRam": ns.getServerMaxRam(s),
				"threads": "",
				"maxMoney": 0,
				"avaMoney": 0,
				"minSecurity": 0,
				"level": 0,
				"personal": true,
				"primed": false
			}
	});
	
	servers = servers.concat(pservers);
	while(true){
		CONFIG = getConfig(ns);
		//updates list of personal servers with new servers or updated max ram values
		if(LL.data[0] != "NULL PORT DATA"){
			let pu = JSON.parse(LL.data.shift());
			updatePServers(servers, pu);
		}
		//try and rootAccess servers that are hackable (ie ports and level)
		let availableExe = EXECUTABLES.filter(ex => {
			return ns.fileExists(ex, "home");
		});
		
		hlvl = ns.getHackingLevel();
		servers.filter(f => {
			return !f.personal;
		}).forEach((s) => {
			if(hlvl >= s.level && !s.root) {
				availableExe.forEach((e) => {
					switch(e) {
						case "BruteSSH.exe":
							ns.brutessh(s);
							break;
						case "FTPCrack.exe":
							ns.ftpcrack(s);
							break;
						case "relaySMTP.exe":
							ns.relaysmtp(s);
							break;
						case "HTTPWorm.exe":
							ns.httpworm(s);
							break;
						case "SQLInject.exe":
							ns.sqlinject(s);
							break;
					}
				});
				ns.nuke(s);
				if(ns.hasRootAccess){
					s.root = true;
				}
			}
		});
		
		//finds servers with root access
		let rootServers = servers.filter(s => {
			if(s.root) return s;
		});
		
		//make array with all unowned servers with rootAccess and personal servers
		//copy made due to max money sort later to find priority.
		let serverList = rootServers;
		
		//sorts list to highest max money server.
		let priority = rootServers.sort((a, b) => { 
			return b.maxMoney - a.maxMoney;
		}).shift();
		priority.avaMoney = ns.getServerMoneyAvailable(priority.hostname);
		//priority primed check
		if(PRL.data[0] != "NULL PORT DATA"){
			let p = JSON.parse(PRL.data.shift());
			if(priority.hostname == p.hostname){
				priority.primed = p.primed;
			}
		}
		
		
		//port writing section
		LBS.data[0] = JSON.stringify(serverList);
		AZS.data[0] = JSON.stringify(priority);
		if(!CONFIG.runLoadBalancer) setConfig(ns, {"runLoadBalancer": true});
		if(!CONFIG.runAnalyzer) setConfig(ns, {"runAnalyzer": true});
		await ns.sleep(CONFIG.interval);
	}
}
