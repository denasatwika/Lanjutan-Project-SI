import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/User";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "kelompoksi-inventory-app" });

// Ingest function to save user data to a database
export const syncUserCreation = inngest.createFunction(
    {
        id: 'sync-user-from-clerk'
    },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data;
        const userData = { 
            _id: id,
            name: first_name + ' ' + last_name, 
            email: email_addresses[0].email_address, 
            imageUrl: image_url 
        
        };

        await connectDB()
        await User.create(userData)
  
    }
)

// Ingest function to update user data in the database
export const syncUserUpdation = inngest.createFunction(
    {
        id: 'update-user-from-clerk'
    },
        { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data;
        const userData = { 
            _id: id,
            name: first_name + ' ' + last_name, 
            email: email_addresses[0].email_address, 
            imageUrl: image_url
    
        }
        await connectDB()
        await User.findByIdAndUpdate(id, userData)
    }
)

// Inngest function to delete user data from the database
export const syncUserDeletion = inngest.createFunction(
    {
        id: 'delete-user-with-clerk'
    },
        { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { id } = event.data;
        await connectDB()
        await User.findByIdAndDelete(id)
    }
)

// Ingest function to create user order in the database
export const createUserOrder = inngest.createFunction(
    {
        id: 'create-user-order',
        batchEvents: {
            maxSize: 5,
            timeout: '5s'
        }
    },
    {event: 'order/created'},
    async (events) => {

        const orders = events.map((event)=> {
            return {
                userId: event.data.userId,
                items: event.data.items,
                amount: event.data.amount,
                address: event.data.address,
                data : event.data.date
            }
        })

        await connectDB()
        await Order.insertMany(orders)

        return { success: true, processed: orders.length };

    }
)
