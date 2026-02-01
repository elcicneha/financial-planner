import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormTab } from "./components/FormTab";
import { ExcelTab } from "./components/ExcelTab";

export default function ExpensesPage() {
  return (

    <Tabs defaultValue="excel" >
      <TabsList variant="line" className=" ">
        <TabsTrigger value="form">Form</TabsTrigger>
        <TabsTrigger value="excel">Excel</TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="mt-8">
        <FormTab />
      </TabsContent>

      <TabsContent value="excel" className="mt-8">
        <ExcelTab />
      </TabsContent>
    </Tabs>
  );
}
