import { Server } from 'socket.io';
import { type ViteDevServer } from 'vite';

const sid_to_scout: Map<string, string> = new Map();
const robotQueue: [string, 'red' | 'blue'][] = [];
let curr_match_key: string = '';

const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return;
		const io = new Server(server.httpServer);

		io.on('connect', (socket) => {
			if (socket.handshake.auth.token === 'celary') socket.join('admin_room');

			socket.on('join_queue', (scout_id) => {
				sid_to_scout.set(socket.id, scout_id);

				const team_data = robotQueue.pop();
				if (!team_data) {
					io.to('admin_room').emit('scout_joined_queue', scout_id);
					socket.join('scout_queue');
					return;
				}
				socket.emit('time_to_scout', [curr_match_key, ...team_data]);
			});

			socket.on('leave_queue', () => {
				const scout_id = sid_to_scout.get(socket.id);

				io.in('admin_room').emit('scout_left_queue', scout_id);
				socket.leave('scout_queue');
			});

			socket.on('send_match', ([match_key, teams]: [string, [string, 'red' | 'blue'][]]) => {
				if (!socket.rooms.has('admin_room')) return;

				const scout_queue: Set<string> | undefined = io
					.of('/')
					.adapter.rooms.get('scout_queue');
				if (scout_queue) {
					for (const sid of scout_queue.values()) {
						const team_data = teams.pop();
						if (!team_data) break;

						const scout_id = sid_to_scout.get(sid);

						socket.leave('scout_queue');
						io.to('admin_room').emit('scout_left_queue', scout_id);
						io.to(sid).emit('time_to_scout', [match_key, ...team_data]);
					}
				}

				robotQueue.push(...teams);

				// Update all connected sockets with new match info (for cosmetic purposes)
				io.emit('new_match', match_key);
				curr_match_key = match_key;
			});

			// Event-listener sockets that were offline to sync back up with the current match key
			socket.on('request_curr_match', () => {
				socket.emit('new_match', curr_match_key);
			});
		});
	}
};

export default webSocketServer;
