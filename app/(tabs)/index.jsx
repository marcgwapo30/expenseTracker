import { useState, useCallback, useEffect, useMemo } from "react";
import { Alert, Platform, TextInput, View, Modal } from "react-native";
import styled from "styled-components/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNPickerSelect from "react-native-picker-select";
import { Calendar } from 'react-native-calendars';
import moment from 'moment';

// ✅ Async Storage Helper Functions
const STORAGE_KEY = "expenses";
const BALANCE_KEY = "permanentBalance";
const TOTAL_INCOME_KEY = "totalIncome";

const saveExpensesToStorage = async (expenses) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error("Failed to save expenses:", error);
  }
};

const loadExpensesFromStorage = async () => {
  try {
    const storedExpenses = await AsyncStorage.getItem(STORAGE_KEY);
    return storedExpenses ? JSON.parse(storedExpenses) : [];
  } catch (error) {
    console.error("Failed to load expenses:", error);
    return [];
  }
};

const saveBalanceToStorage = async (balance) => {
  try {
    await AsyncStorage.setItem(BALANCE_KEY, JSON.stringify(balance));
  } catch (error) {
    console.error("Failed to save balance:", error);
  }
};

const loadBalanceFromStorage = async () => {
  try {
    const storedBalance = await AsyncStorage.getItem(BALANCE_KEY);
    return storedBalance ? JSON.parse(storedBalance) : 0;
  } catch (error) {
    console.error("Failed to load balance:", error);
    return 0;
  }
};

const saveTotalIncomeToStorage = async (totalIncome) => {
  try {
    await AsyncStorage.setItem(TOTAL_INCOME_KEY, JSON.stringify(totalIncome));
  } catch (error) {
    console.error("Failed to save total income:", error);
  }
};

const loadTotalIncomeFromStorage = async () => {
  try {
    const storedTotalIncome = await AsyncStorage.getItem(TOTAL_INCOME_KEY);
    return storedTotalIncome ? JSON.parse(storedTotalIncome) : 0;
  } catch (error) {
    console.error("Failed to load total income:", error);
    return 0;
  }
};

// Update the color palette for a more luxurious look
const COLORS = {
  primary: '#6366F1',    // Indigo
  secondary: '#8B5CF6',  // Purple
  accent: '#EC4899',     // Pink
  success: '#10B981',    // Emerald
  danger: '#EF4444',     // Red
  warning: '#F59E0B',    // Amber
  background: '#F8FAFC',  // Light slate
  card: '#FFFFFF',
  text: '#1E293B',       // Slate
  textLight: '#64748B',  // Light slate
  border: '#E2E8F0',
  gradient: {
    start: '#6366F1',
    end: '#8B5CF6'
  }
};

export default function ExpenseTracker() {
  const [form, setForm] = useState({
    date: "",
    description: "",
    category: "",
    amount: "",
    paymentMethod: "",
    type: "expense",
  });
  const [expenses, setExpenses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [permanentBalance, setPermanentBalance] = useState(0);
  const [permanentTotalIncome, setPermanentTotalIncome] = useState(0);

  // ✅ Load expenses on mount
  useEffect(() => {
    const loadData = async () => {
      const [loadedExpenses, loadedBalance, loadedTotalIncome] = await Promise.all([
        loadExpensesFromStorage(),
        loadBalanceFromStorage(),
        loadTotalIncomeFromStorage()
      ]);
      setExpenses(loadedExpenses);
      setPermanentBalance(loadedBalance);
      setPermanentTotalIncome(loadedTotalIncome);
    };
    loadData();
  }, []);

  // ✅ Handle input changes
  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Updated handleDateChange
  const handleDateChange = (date) => {
    setShowCalendar(false);
    setForm(prev => ({
      ...prev,
      date: date.dateString
    }));
  };

  // Format date for display
  const formatDisplayDate = (date) => {
    return date ? moment(date).format('MMMM D, YYYY') : 'Select Date';
  };

  // Fixed delete function
  const deleteExpense = useCallback((id) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? The balance will remain unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Only remove from expenses list, don't affect balance
              const updatedExpenses = expenses.filter(expense => expense.id !== id);
              await saveExpensesToStorage(updatedExpenses);
              setExpenses(updatedExpenses);
              
              Alert.alert("Success", "Transaction deleted from history");
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert("Error", "Failed to delete transaction");
            }
          }
        }
      ]
    );
  }, [expenses]);

  // Fixed addOrUpdateExpense function
  const addOrUpdateExpense = useCallback(async () => {
    const { date, description, category, amount, paymentMethod, type } = form;
    
    if (!date || !description || !category || !amount || !paymentMethod) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      const parsedAmount = parseFloat(amount);
      const newExpense = {
        id: editingId || Date.now().toString(),
        date,
        description,
        category,
        amount: parsedAmount,
        paymentMethod,
        type: type || 'expense'
      };

      // Update expenses
    const updatedExpenses = editingId
        ? expenses.map(expense => 
            expense.id === editingId ? newExpense : expense
          )
        : [...expenses, newExpense];

      // Calculate new balances
      let newBalance = permanentBalance;
      let newTotalIncome = permanentTotalIncome;

      if (type === 'income') {
        // For income, add to both balance and total income
        newBalance += parsedAmount;
        newTotalIncome += parsedAmount;
      } else {
        // For expense, only subtract from balance
        newBalance -= parsedAmount;
      }

      // Save all data
      await Promise.all([
        saveExpensesToStorage(updatedExpenses),
        saveBalanceToStorage(newBalance),
        saveTotalIncomeToStorage(newTotalIncome)
      ]);

      // Update all state
    setExpenses(updatedExpenses);
      setPermanentBalance(newBalance);
      setPermanentTotalIncome(newTotalIncome);

      // Reset form
      setForm({
        date: "",
        description: "",
        category: "",
        amount: "",
        paymentMethod: "",
        type: "expense"
      });
    setEditingId(null);

      Alert.alert(
        "Success", 
        editingId 
          ? `${type === 'income' ? 'Income' : 'Expense'} updated` 
          : `${type === 'income' ? 'Income' : 'Expense'} added`
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert("Error", "Failed to save transaction");
    }
  }, [form, expenses, permanentBalance, permanentTotalIncome, editingId]);

  // ✅ Edit Expense
  const editExpense = (expense) => {
    try {
      setForm({
        ...expense,
        amount: expense.amount.toString(),
        type: expense.type || 'expense'
      });
    setEditingId(expense.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to edit transaction');
      console.error('Edit error:', error);
    }
  };

  // ✅ Compute total amount efficiently
  const totalAmount = useMemo(() => expenses.reduce((sum, { amount }) => sum + amount, 0), [expenses]);

  // Update the expense list rendering
  const renderExpenseItem = useCallback(({ item }) => (
    <ExpenseItem>
      <ExpenseText>
        {item.date} - {item.description} - ₱{parseFloat(item.amount).toFixed(2)}
      </ExpenseText>
      <ButtonGroup>
        <EditButton 
          onPress={() => editExpense(item)}
          activeOpacity={0.7}
        >
          <ButtonText>✏️</ButtonText>
        </EditButton>
        <DeleteButton 
          onPress={() => deleteExpense(item.id)}
          activeOpacity={0.7}
        >
          <ButtonText>❌</ButtonText>
        </DeleteButton>
      </ButtonGroup>
    </ExpenseItem>
  ), []);

  // Add modal close handler
  const handleCloseCalendar = () => {
    setShowCalendar(false); 
  };

  // Add backdrop press handler
  const handleBackdropPress = () => {
    setShowCalendar(false);
  };

  // Add income categories
  const INCOME_CATEGORIES = [
    { label: "Salary 💰", value: "Salary" },
    { label: "Freelance 💻", value: "Freelance" },
    { label: "Business 🏪", value: "Business" },
    { label: "Investment 📈", value: "Investment" },
    { label: "Other 🔖", value: "Other" },
  ];

  // Update expense categories
  const EXPENSE_CATEGORIES = [
    { label: "Travel ✈️", value: "Travel" },
    { label: "Food 🍕", value: "Food" },
    { label: "Office Supplies 🖊️", value: "Office Supplies" },
    { label: "Other 🔖", value: "Other" },
  ];

  // Update the total calculations
  const totalIncome = useMemo(() => 
    expenses
      .filter(item => item.type === 'income')
      .reduce((sum, { amount }) => sum + amount, 0), 
    [expenses]
  );

  const totalExpenses = useMemo(() => 
    expenses
      .filter(item => item.type === 'expense')
      .reduce((sum, { amount }) => sum + amount, 0), 
    [expenses]
  );

  // First, add a reset balance function
  const resetBalance = useCallback(async () => {
    Alert.alert(
      "Reset Balance",
      "Are you sure you want to reset your current balance to 0?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              // Reset balance to 0
              await saveBalanceToStorage(0);
              setPermanentBalance(0);
              Alert.alert("Success", "Balance has been reset to 0");
            } catch (error) {
              console.error('Reset error:', error);
              Alert.alert("Error", "Failed to reset balance");
            }
          }
        }
      ]
    );
  }, []);

  return (
      <Container>
      <ScrollContainer>
        <HeaderSection>
        <Title>💸 Expense Tracker</Title>
          <TotalCard>
            <TotalRow>
              <TotalLabel>Current Balance</TotalLabel>
              <BalanceContainer>
                <Balance positive={permanentBalance >= 0}>
                  {permanentBalance >= 0 ? '+' : '-'}₱{Math.abs(permanentBalance).toFixed(2)}
                </Balance>
                <ResetButton onPress={resetBalance} activeOpacity={0.7}>
                  <ResetIcon>🔄</ResetIcon>
                </ResetButton>
              </BalanceContainer>
            </TotalRow>
            <TotalDivider />
            <TotalRow>
              <TotalLabel>Recent Income</TotalLabel>
              <TotalIncome>+₱{totalIncome.toFixed(2)}</TotalIncome>
            </TotalRow>
            <TotalRow>
              <TotalLabel>Recent Expenses</TotalLabel>
              <TotalExpense>-₱{totalExpenses.toFixed(2)}</TotalExpense>
            </TotalRow>
          </TotalCard>
        </HeaderSection>

        <FormContainer>
          <TypeSelector>
            <TypeButton 
              active={form.type === 'expense'}
              onPress={() => handleChange('type', 'expense')}
            >
              <TypeButtonText active={form.type === 'expense'}>💸 Expense</TypeButtonText>
            </TypeButton>
            <TypeButton 
              active={form.type === 'income'}
              onPress={() => handleChange('type', 'income')}
            >
              <TypeButtonText active={form.type === 'income'}>💰 Income</TypeButtonText>
            </TypeButton>
          </TypeSelector>

          <DateInputContainer>
            <DateInput
              value={formatDisplayDate(form.date)}
              onPressIn={() => setShowCalendar(true)}
              placeholder="Select Date"
              editable={false}
            />
            <DateIconButton 
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <ButtonText>📅</ButtonText>
            </DateIconButton>
          </DateInputContainer>

          {/* Updated Calendar Modal */}
          <Modal
            transparent={true}
            visible={showCalendar}
            animationType="fade"
            onRequestClose={handleCloseCalendar}
          >
            <CalendarModalBackdrop onPress={handleBackdropPress}>
              <CalendarWrapper>
                <CalendarHeader>
                  <CalendarTitle>Select Date</CalendarTitle>
                  <CloseButton 
                    onPress={handleCloseCalendar}
                    activeOpacity={0.7}
                  >
                    <CloseButtonText>✕</CloseButtonText>
                  </CloseButton>
                </CalendarHeader>
                <Calendar
                  onDayPress={handleDateChange}
                  markedDates={{
                    [form.date]: { selected: true, selectedColor: '#007bff' }
                  }}
                  theme={{
                    todayTextColor: '#007bff',
                    selectedDayBackgroundColor: '#007bff',
                    arrowColor: '#007bff',
                  }}
                />
              </CalendarWrapper>
            </CalendarModalBackdrop>
          </Modal>

          <Input
            placeholder="✍️ Description"
            value={form.description}
            onChangeText={(value) => handleChange("description", value)}
          />

          <RNPickerSelect
            style={pickerSelectStyles}
            value={form.category}
            onValueChange={(value) => handleChange("category", value)}
            items={form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES}
            placeholder={{ 
              label: form.type === 'expense' ? "📌 Select Expense Category" : "📌 Select Income Category", 
              value: null 
            }}
          />

          <Input
            placeholder="💰 Amount (₱)"
            value={form.amount}
            onChangeText={(value) => handleChange("amount", value)}
            keyboardType="numeric"
          />

          <RNPickerSelect
            style={pickerSelectStyles}
            value={form.paymentMethod}
            onValueChange={(value) => handleChange("paymentMethod", value)}
            items={[
              { label: "Cash 💵", value: "Cash" },
              { label: "Credit Card 💳", value: "Credit Card" },
              { label: "Bank Transfer 🏦", value: "Bank Transfer" },
            ]}
            placeholder={{ label: "💳 Select Payment Method", value: null }}
          />

          <AddButton onPress={addOrUpdateExpense}>
            <ButtonText>
              {editingId 
                ? `✏️ Update ${form.type === 'income' ? 'Income' : 'Expense'}`
                : `➕ Add ${form.type === 'income' ? 'Income' : 'Expense'}`
              }
            </ButtonText>
            </AddButton>
        </FormContainer>

        <ExpenseList>
          <ExpenseListHeader>
            Recent {form.type === 'income' ? 'Income' : 'Expense'} Transactions
          </ExpenseListHeader>
          {expenses.map((expense) => (
            <ExpenseItem 
              key={expense.id}
              type={expense.type || 'expense'}
            >
              <ExpenseItemHeader>
                <ExpenseDate>{moment(expense.date).format('MMM D, YYYY')}</ExpenseDate>
                <ExpenseAmount type={expense.type || 'expense'}>
                  {expense.type === 'income' ? '+' : '-'}₱{parseFloat(expense.amount).toFixed(2)}
                </ExpenseAmount>
              </ExpenseItemHeader>
              <ExpenseDescription>{expense.description}</ExpenseDescription>
              <CategoryBadge type={expense.type || 'expense'}>
                <CategoryText type={expense.type || 'expense'}>
                  {expense.category} • {expense.paymentMethod}
                </CategoryText>
              </CategoryBadge>
              <ButtonGroup>
                <EditButton 
                  onPress={() => editExpense(expense)}
                  activeOpacity={0.7}
                >
                  <ButtonText>✏️ Edit</ButtonText>
                </EditButton>
                <DeleteButton 
                  onPress={() => deleteExpense(expense.id)}
                  activeOpacity={0.7}
                >
                  <ButtonText>🗑️ Delete</ButtonText>
                </DeleteButton>
              </ButtonGroup>
            </ExpenseItem>
          ))}
        </ExpenseList>
      </ScrollContainer>
      </Container>
  );
}

// ✅ Styled Components for React Native
const Container = styled.View`
  flex: 1;
  background-color: ${COLORS.background};
`;

const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

const HeaderSection = styled.View`
  background-color: ${COLORS.primary};
  padding: 40px 20px 30px 20px;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  shadow-color: ${COLORS.primary};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
  elevation: 8;
  margin-bottom: 24px;
  margin-top: 50px;
`;

const Title = styled.Text`
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  color: white;
  margin-bottom: 16px;
`;

const TotalCard = styled.View`
  background-color: rgba(255, 255, 255, 0.15);
  padding: 20px;
  border-radius: 16px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.2);
`;

const TotalRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-vertical: 4px;
`;

const TotalLabel = styled.Text`
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
`;

const TotalIncome = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: ${COLORS.success};
`;

const TotalExpense = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: ${COLORS.accent};
`;

const TotalDivider = styled.View`
  height: 1px;
  background-color: rgba(255, 255, 255, 0.2);
  margin-vertical: 8px;
`;

const BalanceContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Balance = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.positive ? COLORS.success : COLORS.danger};
  margin-right: 4px;
`;

const ResetButton = styled.TouchableOpacity`
  background-color: rgba(255, 255, 255, 0.2);
  padding: 8px;
  border-radius: 20px;
  width: 36px;
  height: 36px;
  justify-content: center;
  align-items: center;
`;

const ResetIcon = styled.Text`
  font-size: 18px;
`;

const FormContainer = styled.View`
  background-color: ${COLORS.card};
  margin: 16px;
  padding: 24px;
  border-radius: 20px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 12px;
  elevation: 5;
  gap: 20px;
`;

const Input = styled.TextInput`
  padding: 16px;
  background-color: ${COLORS.background};
  border-radius: 12px;
  font-size: 16px;
  color: ${COLORS.text};
  border-width: 1px;
  border-color: ${COLORS.border};
`;

const DateInputContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

const DateInput = styled(Input)`
  flex: 1;
  color: ${props => props.value === 'Select Date' ? COLORS.textLight : COLORS.text};
`;

const DateIconButton = styled.TouchableOpacity`
  background-color: ${COLORS.secondary};
  padding: 16px;
  border-radius: 12px;
    justify-content: center;
    align-items: center;
  shadow-color: ${COLORS.secondary};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.3;
  shadow-radius: 4px;
  elevation: 3;
`;

const AddButton = styled.TouchableOpacity`
  background-color: ${COLORS.primary};
  padding: 18px;
  border-radius: 14px;
  align-items: center;
  shadow-color: ${COLORS.primary};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 6px;
  elevation: 4;
  margin-top: 8px;
`;

const ExpenseList = styled.View`
  padding: 0 16px 20px 16px;
`;

const ExpenseListHeader = styled.Text`
  font-size: 20px;
  font-weight: bold;
  color: ${COLORS.text};
  margin-bottom: 12px;
  margin-left: 4px;
`;

const ExpenseItem = styled.View`
  background-color: ${COLORS.card};
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 16px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 3;
  border-left-width: 4px;
  border-left-color: ${props => props.type === 'income' ? COLORS.success : COLORS.primary};
`;

const ExpenseItemHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ExpenseDate = styled.Text`
  font-size: 14px;
  color: ${COLORS.textLight};
`;

const ExpenseAmount = styled.Text`
  font-size: 20px;
  font-weight: bold;
  color: ${props => props.type === 'income' ? COLORS.success : COLORS.accent};
`;

const ExpenseDescription = styled.Text`
  font-size: 16px;
  color: ${COLORS.text};
  font-weight: 500;
  margin-bottom: 4px;
`;

const ExpenseCategory = styled.Text`
  font-size: 14px;
  color: ${COLORS.textLight};
`;

const ButtonGroup = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  border-top-width: 1px;
  border-top-color: ${COLORS.border};
  padding-top: 16px;
`;

const EditButton = styled.TouchableOpacity`
  background-color: ${COLORS.warning};
  padding: 10px 20px;
  border-radius: 10px;
  flex-direction: row;
  align-items: center;
  shadow-color: ${COLORS.warning};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: 3;
`;

const DeleteButton = styled(EditButton)`
  background-color: ${COLORS.danger};
  min-width: 80px;
  padding: 10px 20px;
  border-radius: 10px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  shadow-color: ${COLORS.danger};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: 3;
`;

// Update pickerSelectStyles
const pickerSelectStyles = {
  inputIOS: {
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputAndroid: {
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    fontSize: 16,
    color: COLORS.text,
  },
};

const CalendarModalBackdrop = styled.Pressable`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 20px;
`;

const CalendarWrapper = styled.View`
  background-color: ${COLORS.card};
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 350px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.2;
  shadow-radius: 12px;
  elevation: 8;
`;

const CalendarHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const CalendarTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #333;
`;

const CloseButton = styled.TouchableOpacity`
  padding: 8px;
  background-color: #f2f2f2;
  border-radius: 20px;
  width: 36px;
  height: 36px;
  justify-content: center;
  align-items: center;
`;

// Add new CloseButtonText component
const CloseButtonText = styled.Text`
  color: #333;
  font-size: 20px;
  font-weight: bold;
`;

const ButtonText = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

// Add these new styled components for better typography
const CategoryBadge = styled.View`
  background-color: ${props => 
    props.type === 'income' ? `${COLORS.success}15` : `${COLORS.primary}15`};
  padding: 6px 12px;
  border-radius: 8px;
  align-self: flex-start;
  margin-top: 8px;
`;

const CategoryText = styled.Text`
  color: ${props => props.type === 'income' ? COLORS.success : COLORS.primary};
  font-size: 14px;
  font-weight: 600;
`;

// Add these new styled components
const TypeSelector = styled.View`
  flex-direction: row;
  gap: 12px;
  margin-bottom: 16px;
`;

const TypeButton = styled.TouchableOpacity`
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  align-items: center;
  background-color: ${props => props.active ? COLORS.primary : COLORS.background};
  shadow-color: ${props => props.active ? COLORS.primary : 'transparent'};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: ${props => props.active ? 3 : 0};
`;

const TypeButtonText = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: ${props => props.active ? 'white' : COLORS.textLight};
`;