'use strict';
const http=require('http');
const pug=require('pug');
const iosocket=require('socket.io');

const port = 8001
const server=http.createServer((req,res)=>{
    res.writeHeader(200,{'Content-Type':'text/html'});
    if(req.url==='/'){
        res.end(pug.renderFile('./index.pug'));
    }else{
        res.end();
    }
});
server.listen(port);
console.log(`服务器已成功启动: http://localhost:${port}`)

const io=iosocket.listen(server);
io.on('connection',function(socket){
    //断开连接后，刷新房间信息和在线信息
    socket.on('disconnect',function(data){
        RoomManager.getInstance().removeNick(socket.room,socket.nick);
        io.to(socket.room).emit('refreshRooms',RoomManager.getInstance().getRooms());
        io.to(socket.room).emit('refreshNicks',RoomManager.getInstance().getNicks(socket.room));
    });
    
    //接收到消息后，向房间内其他人广播消息
    socket.on('message',function(data){
        socket.broadcast.to(data.room).emit('message',data.message);
    });
    
    //加入房间，刷新房间信息和在线信息
    socket.on('joinRoom',function(data){
        socket.join(data.room);
        io.to(data.room).emit('message',`小伙伴${data.nick} 来了(^o^) 。。。`);
        socket.room=data.room;
        socket.nick=data.nick;
        RoomManager.getInstance().addNick(data.room,data.nick);
        io.to(data.room).emit('refreshRooms',RoomManager.getInstance().getRooms());
        io.to(data.room).emit('refreshNicks',RoomManager.getInstance().getNicks(data.room));
    });
    
    //离开房间，刷新房间信息和在线信息
    socket.on('leaveRoom',function(data){
        socket.leave(data.room);
        io.to(data.room).emit('message',`${data.nick} 一路走好(T_T) 。。。`);
        socket.room=data.room;
        socket.nick=data.nick;
        RoomManager.getInstance().removeNick(data.room,data.nick);
        io.to(data.room).emit('refreshRooms',RoomManager.getInstance().getRooms());
        io.to(data.room).emit('refreshNicks',RoomManager.getInstance().getNicks(data.room));
    });
    
    //改变昵称，刷新在线信息
    socket.on('changeNick',function(data){
        io.to(data.room).emit('message',`小伙伴${data.nickOld}神奇的变成了${data.nickNew}(⊙o⊙)。。。`);
        socket.room=data.room;
        socket.nick=data.nick;
        RoomManager.getInstance().changeNick(data.room,data.nickNew,data.nickOld);
        io.to(data.room).emit('refreshNicks',RoomManager.getInstance().getNicks(data.room));
    });
    
    //socket连上之后，刷新房间信息
    socket.emit('refreshRooms',RoomManager.getInstance().getRooms());
});

class RoomManager{
    constructor(){
        this.roomMap=new Map();
    }
    
    //取得RoomManager实例
    static getInstance(){
        if(!RoomManager.instance){
            RoomManager.instance=new RoomManager();
        }
        
        return RoomManager.instance;
    }
    
    //取得所有的昵称
    getNicks(room){
        if(this.roomMap.has(room)){
            return Array.from(this.roomMap.get(room));
        }else{
            return [];
        }
    }
    
    //取得所有的房间
    getRooms(){
        return Array.from(this.roomMap.keys());
    }

    //添加昵称
    addNick(room,nick){
        if(this.roomMap.has(room)){
            this.roomMap.get(room).add(nick);
        }else{
            let nickSet=new Set();
            nickSet.add(nick);
            this.roomMap.set(room,nickSet);
        }
    }

    //删除昵称
    removeNick(room,nick){
        if(this.roomMap.has(room)){
            let nickSet=this.roomMap.get(room);
            nickSet.delete(nick);
            
            //如果该房间人数为0，那么关闭该房间
            if(nickSet.size===0){
                this.roomMap.delete(room)
            }
        }
    }
    
    //修改昵称
    changeNick(room,nickNew,nickOld){
        this.addNick(room,nickNew);
        this.removeNick(room,nickOld);
    }
}