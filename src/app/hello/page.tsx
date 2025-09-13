// src/app/hello/page.tsx
 
 import HelloWorldInteractiveButton from '@/components/HelloWorldInteractiveButton';
 
 // 这是一个服务器组件 (Server Component)
 export default function HelloPage() {
   // 这行代码在服务器上执行！
   // 当页面被请求时，服务器会获取当前时间。
   const serverTime = new Date().toLocaleTimeString();
   
     return (
       <main className="p-8">
         <h1 className="text-2xl font-bold">Hello World from the Server!</h1>
         <p className="mt-4">
           这部分内容是在服务器上渲染的。
         </p>
         <p>
           服务器渲染时间: {serverTime}
         </p>
         <p className="mt-4 text-gray-500">
           (刷新页面，你会看到这个时间会改变，因为它每次都是在服务器上重新生成的)
         </p>
   
         <hr className="my-8" />
   
         {/*
           现在，我们在服务器组件中，嵌入一个客户端组件。
           我们还可以从服务器向客户端组件传递 props (数据)。
         */}
         <HelloWorldInteractiveButton initialMessage="来自服务器的问候！" />
       </main>
     );
   }
