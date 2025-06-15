const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage
const users = [];
const items = [];
const bids = [];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User routes
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    
    // Check if username already exists
    if (users.some(u => u.username === username)) {
        return res.json({ success: false, message: 'Username already exists' });
    }
    
    // Check if email already exists
    if (users.some(u => u.email === email)) {
        return res.json({ success: false, message: 'Email already exists' });
    }
    
    // Create new user
    const newUser = {
        id: users.length + 1,
        username,
        email,
        password,
        items: [],
        bids: []
    };
    
    users.push(newUser);
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Check if user exists
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.json({ success: true, user: { id: user.id, username: user.username } });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

// Item routes
app.get('/api/items', (req, res) => {
    res.json(items);
});

app.post('/api/items', (req, res) => {
    const { title, description, imageUrl, startingBid, endDate, sellerId } = req.body;
    
    const newItem = {
        id: items.length + 1,
        title,
        description,
        imageUrl: imageUrl || null,
        startingBid: parseFloat(startingBid),
        currentBid: parseFloat(startingBid),
        endDate: new Date(endDate),
        sellerId: parseInt(sellerId),
        highestBidderId: null,
        status: 'active', // active, ended, paid
        createdAt: new Date()
    };
    
    items.push(newItem);
    res.json({ success: true, item: newItem });
});

// Bid routes
app.post('/api/bids', (req, res) => {
    const { itemId, userId, bidAmount } = req.body;
    
    const item = items.find(i => i.id === parseInt(itemId));
    
    if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    if (item.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Auction has ended' });
    }
    
    if (parseFloat(bidAmount) <= item.currentBid) {
        return res.status(400).json({ success: false, message: 'Bid must be higher than current bid' });
    }
    
    // Update item with new bid
    item.currentBid = parseFloat(bidAmount);
    item.highestBidderId = parseInt(userId);
    
    // Record the bid
    const newBid = {
        id: bids.length + 1,
        itemId: parseInt(itemId),
        userId: parseInt(userId),
        amount: parseFloat(bidAmount),
        createdAt: new Date()
    };
    
    bids.push(newBid);
    res.json({ success: true, bid: newBid, item });
});

// Payment simulation route
app.post('/api/payment', (req, res) => {
    const { itemId, userId } = req.body;
    
    const item = items.find(i => i.id === parseInt(itemId));
    
    if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    if (item.highestBidderId !== parseInt(userId)) {
        return res.status(403).json({ success: false, message: 'Only the highest bidder can make payment' });
    }
    
    // Update item status to paid
    item.status = 'paid';
    
    res.json({ success: true, item });
});

// Check auction status and update ended auctions
function updateAuctionStatus() {
    const now = new Date();
    
    items.forEach(item => {
        if (item.status === 'active' && item.endDate < now) {
            item.status = 'ended';
        }
    });
}

// Run auction status update every minute
setInterval(updateAuctionStatus, 60000);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Add these admin routes to your server.js file

// Admin routes
app.get('/api/admin/stats', (req, res) => {
    const stats = {
        totalUsers: users.length,
        totalItems: items.length,
        activeAuctions: items.filter(item => item.status === 'active').length,
        totalBids: bids.length
    };
    
    res.json(stats);
});

app.get('/api/admin/activity', (req, res) => {
    // Combine recent bids and item creations for activity feed
    const bidActivities = bids.map(bid => {
        const user = users.find(u => u.id === bid.userId);
        const item = items.find(i => i.id === bid.itemId);
        
        return {
            type: 'Bid',
            details: `Bid ₹${bid.amount.toFixed(2)} on ${item ? item.title : 'Unknown Item'}`,
            username: user ? user.username : 'Unknown User',
            timestamp: bid.createdAt
        };
    });
    
    const itemActivities = items.map(item => {
        const seller = users.find(u => u.id === item.sellerId);
        
        return {
            type: 'Item Listed',
            details: `Listed "${item.title}" for ₹${item.startingBid.toFixed(2)}`,
            username: seller ? seller.username : 'Unknown User',
            timestamp: item.createdAt
        };
    });
    
    // Combine and sort by timestamp (newest first)
    const allActivities = [...bidActivities, ...itemActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10); // Get only the 10 most recent activities
    
    res.json(allActivities);
});

app.get('/api/admin/users', (req, res) => {
    const usersWithCounts = users.map(user => {
        const userItems = items.filter(item => item.sellerId === user.id).length;
        const userBids = bids.filter(bid => bid.userId === user.id).length;
        
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            itemsCount: userItems,
            bidsCount: userBids
        };
    });
    
    res.json(usersWithCounts);
});

app.get('/api/admin/items', (req, res) => {
    const itemsWithDetails = items.map(item => {
        const seller = users.find(u => u.id === item.sellerId);
        const winner = users.find(u => u.id === item.highestBidderId);
        
        return {
            id: item.id,
            title: item.title,
            sellerName: seller ? seller.username : 'Unknown',
            currentBid: item.currentBid,
            status: item.status,
            endDate: item.endDate,
            winnerName: winner ? winner.username : null
        };
    });
    
    res.json(itemsWithDetails);
});

app.get('/api/admin/bids', (req, res) => {
    const bidsWithDetails = bids.map(bid => {
        const bidder = users.find(u => u.id === bid.userId);
        const item = items.find(i => i.id === bid.itemId);
        
        return {
            id: bid.id,
            itemId: bid.itemId,
            itemTitle: item ? item.title : 'Unknown Item',
            bidderId: bid.userId,
            bidderName: bidder ? bidder.username : 'Unknown User',
            amount: bid.amount,
            timestamp: bid.createdAt
        };
    });
    
    // Sort by timestamp (newest first)
    bidsWithDetails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(bidsWithDetails);
});

app.delete('/api/admin/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.json({ success: false, message: 'User not found' });
    }
    
    // Remove user
    users.splice(userIndex, 1);
    
    // Remove user's items
    const userItems = items.filter(item => item.sellerId === userId);
    userItems.forEach(item => {
        const itemIndex = items.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
            items.splice(itemIndex, 1);
        }
    });
    
    // Remove user's bids
    const userBids = bids.filter(bid => bid.userId === userId);
    userBids.forEach(bid => {
        const bidIndex = bids.findIndex(b => b.id === bid.id);
        if (bidIndex !== -1) {
            bids.splice(bidIndex, 1);
        }
    });
    
    res.json({ success: true });
});

app.delete('/api/admin/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const itemIndex = items.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
        return res.json({ success: false, message: 'Item not found' });
    }
    
    // Remove item
    items.splice(itemIndex, 1);
    
    // Remove bids for this item
    const itemBids = bids.filter(bid => bid.itemId === itemId);
    itemBids.forEach(bid => {
        const bidIndex = bids.findIndex(b => b.id === bid.id);
        if (bidIndex !== -1) {
            bids.splice(bidIndex, 1);
        }
    });
    
    res.json({ success: true });
});

// Get winner information for an item
app.get('/api/items/:id/winner', (req, res) => {
    const itemId = parseInt(req.params.id);
    
    // Find the item
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return res.json({ success: false, message: 'Item not found' });
    }
    
    // If no winner yet
    if (!item.highestBidderId) {
        return res.json({ success: true, winner: null });
    }
    
    // Find the winner
    const winner = users.find(u => u.id === item.highestBidderId);
    
    if (!winner) {
        return res.json({ success: false, message: 'Winner not found' });
    }
    
    // Return winner info (excluding sensitive data)
    res.json({
        success: true,
        winner: {
            id: winner.id,
            username: winner.username
        }
    });
});

// Also update the payment endpoint to store payment date
app.post('/api/payment', (req, res) => {
    const { itemId, userId } = req.body;
    
    // Find the item
    const itemIndex = items.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
        return res.json({ success: false, message: 'Item not found' });
    }
    
    const item = items[itemIndex];
    
    // Check if user is the winner
    if (item.highestBidderId !== userId) {
        return res.json({ success: false, message: 'Only the winner can pay for this item' });
    }
    
    // Check if item is in 'ended' status
    if (item.status !== 'ended') {
        return res.json({ success: false, message: 'This item is not available for payment' });
    }
    
    // Update item status to 'paid'
    items[itemIndex] = {
        ...item,
        status: 'paid',
        paidDate: new Date().toISOString() // Add payment date
    };
    
    res.json({ success: true, item: items[itemIndex] });
});

// Get bid history for an item
app.get('/api/items/:id/bids', (req, res) => {
    const itemId = parseInt(req.params.id);
    
    // Filter bids for this item
    const itemBids = bids.filter(bid => bid.itemId === itemId);
    
    // Sort by createdAt (newest first)
    itemBids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Add usernames to bids
    const bidsWithUsernames = itemBids.map(bid => {
        const user = users.find(u => u.id === bid.userId);
        return {
            id: bid.id,
            itemId: bid.itemId,
            userId: bid.userId,
            amount: bid.amount,
            username: user ? user.username : 'Unknown User',
            timestamp: bid.createdAt.toISOString() // Ensure timestamp is properly set as ISO string
        };
    });
    
    res.json(bidsWithUsernames);
});