import express from "express";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser({}));

interface Balances{
    [key : string] : number
};

interface User{
    id : string,
    balance : Balances
}

interface Order{
    userId : string,
    price : number,
    quantity : number
};

const GOOGL = "GOOGLE";
const USD = "USD";

const users : Array<User> = [
    {
        id : "1",
        balance : {
            "GOOGLE" : 10,
            "USD" : 50000
        }
    },
    {
        id : "2",
        balance : {
            "GOOGLE" : 12,
            "USD" : 47865
        }
    }
];

//Bids and Asks is our order book
const bids : Order[] = [];
const asks : Order[] = [];

function addToBalance(userId : string, addToGoogle : number, addToUsd : number)
{
    const user = users.find((user) => user.id === userId);

    if(!user)
    {
        return;
    }

    user.balance.GOOGL += addToGoogle;
    user.balance.USD += addToUsd;

    return;
}

function fillOrders (side : string, price : number, quantity : number, userId : string) : number
{
    if(side === "bid")
    {
        //Look in Asks

        for(let i = asks.length - 1; i > -1 ; i--)
        {
            if(asks[i].price < price)
            {
                if(asks[i].quantity > quantity)
                {
                    addToBalance(asks[i].userId, -quantity, asks[i].price * quantity);
                    asks[i].quantity -= quantity;
                    
                    addToBalance(userId, quantity, -asks[i].price * quantity);
                    quantity = 0;
                }
                else{
                    addToBalance(asks[i].userId, -asks[i].quantity, asks[i].price * asks[i].quantity);
                    addToBalance(userId, asks[i].quantity, -asks[i].price * asks[i].quantity);
                    quantity -= asks[i].quantity;
                    asks[i].quantity  = 0;
                }
            }
        }

        // Remove in asks if the quantity is 0.

        for(let i = asks.length - 1; i >= 0; i--)
        {
            if(asks[i].quantity == 0)
            {
                asks.splice(i,1);
            }
        }
    }
    else{

        // Look in bids

        for(let i = bids.length - 1; i > -1 ; i--)
        {
            if(bids[i].price > price)
            {
                if(quantity > bids[i].quantity)
                {
                    addToBalance(bids[i].userId, bids[i].quantity, -price * bids[i].quantity);
                    addToBalance(userId, -bids[i].quantity, price * bids[i].quantity);
                    quantity -= bids[i].quantity;
                    bids[i].quantity = 0;
                }
                else{
                    addToBalance(bids[i].userId, quantity, -price * bids[i].quantity);
                    addToBalance(userId, -quantity, price * bids[i].quantity);
                    bids[i].quantity -= quantity;
                    quantity = 0;
                }
            }
        }

        // Remove in bids if quantity is 0.

        for (let i = bids.length - 1; i >= 0; i--)
        {
            if(bids[i].quantity == 0)
            {
                bids.splice(i,1);
            }
        }
    }
    return quantity;
}

app.post("/order", (req,res) => {
    const side : string = req.body.side;
    const price : number = req.body.price;
    const quantity : number = req.body.quantity;
    const userId : string = req.body.userId;

    const user = users.find((user) => user.id === userId);

    if(!user)
    {
        return res.json({
            message : `User with ID : ${userId} is not present`
        })
    }

    // Check whether order is valid or not

    if(side === "bid")
    {
        if(user.balance.USD >= quantity * price)
        {

        }
        else{
            return res.json({
                message : 'You have Insufficient balaance'
            })
        }
    }

    if(side === "ask")
    {
        if(user.balance.GOOGL >= quantity)
        {

        }
        else{
            return res.json({
                message : 'You have Insufficient funds'
            })
        }
    }

    const remQuantity = fillOrders(side, price, quantity, userId);

    if(remQuantity == 0)
    {
        res.json({
            filledQuantity : quantity
        })
        return;
    }

    if(side === "bid")
    {
        bids.push({userId, price, quantity : remQuantity});
        bids.sort((a, b) =>  a.price < b.price ? 1 : -1);
    }
    else{
        asks.push({userId, price, quantity : remQuantity});
        asks.sort((a, b) => a.price < b.price ? -1 : 1);
    }

    res.json({
        filledQuantity : quantity - remQuantity
    });
})

app.get("/depth", (req,res) => {

    // Returns the order book

    const depBids : {
        [price : number] : {
            type : "bid",
            quantity : number
        }
    } = {};

    const depAsks : {
        [price : number] : {
            type : "ask",
            quantity : number
        }
    } = {};

    for(let i = 0; i < bids.length; i++)
    {
        if(!depBids[bids[i].price])
        {
            depBids[bids[i].price].type = "bid";
            depBids[bids[i].price].quantity = bids[i].quantity;
        }
        else{
            depBids[bids[i].price].quantity 
        }
    }

    for(let i = 0; i < asks.length; i++)
    {
        if(!depAsks[asks[i].price])
        {
            depAsks[asks[i].price].type = "ask";
            depAsks[asks[i].price].quantity = asks[i].quantity;
        }
        else{
            depAsks[asks[i].price].quantity += asks[i].quantity;
        }
    }

    res.json({
        Bids : depBids,
        Asks : depAsks
    });
})


app.get("/balances/:userId", (req,res) => {
    const userId = req.params.userId;
    const user = users.find((user)  => user.id === userId);

    if(!user)
    {
        return res.json(`No user with ID : ${userId}`);
    }
    else{
        res.json({
            balances : user.balance
        })
    }
})